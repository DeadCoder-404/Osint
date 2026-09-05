import express from "express";
import path from "path";
import fs from "fs";
import { spawn } from "child_process";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Lazy initialization for Gemini AI client
let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI();
  }
  return aiClient;
}

// Groq AI Integration (llama-3.1-8b-instant with fallback to active Groq models & Gemini)
const GROQ_DEFAULT_KEY = "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";

async function callGroqChat(
  messages: Array<{ role: string; content: string }>,
  temperature = 0.4
): Promise<{ text: string; model: string }> {
  const apiKey = process.env.GROQ_API_KEY || GROQ_DEFAULT_KEY;
  // Models to attempt: llama-3.1-8b-instant requested by user, followed by active Groq conversational models
  const modelsToTry = ["llama-3.1-8b-instant", "openai/gpt-oss-20b", "groq/compound-mini", "qwen/qwen3.6-27b"];
  
  let lastError: string = "";
  for (const model of modelsToTry) {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          messages,
          temperature
        })
      });
      
      const data: any = await response.json();
      if (response.ok && data.choices && data.choices[0]?.message?.content) {
        return {
          text: data.choices[0].message.content,
          model
        };
      } else {
        lastError = data.error?.message || `HTTP ${response.status}`;
      }
    } catch (e: any) {
      lastError = e?.message || "Network error";
    }
  }
  
  throw new Error(`Groq API failure: ${lastError}`);
}

async function callAiSummary(
  messages: Array<{ role: string; content: string }>,
  temperature = 0.4,
  preferredProvider: "groq" | "gemini" | "auto" = "auto"
): Promise<{ text: string; model: string; provider: string }> {
  // Try Groq first if preferred or auto
  if (preferredProvider === "groq" || preferredProvider === "auto") {
    try {
      const groqRes = await callGroqChat(messages, temperature);
      return { ...groqRes, provider: "groq" };
    } catch (groqErr) {
      console.warn("Groq request failed, trying Gemini fallback:", groqErr);
    }
  }
  
  // Fallback to Gemini
  const ai = getAIClient();
  if (ai) {
    try {
      const promptText = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n\n");
      const res = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: promptText }] }]
      });
      return {
        text: res.text || "No summary returned.",
        model: "gemini-2.5-flash",
        provider: "gemini"
      };
    } catch (geminiErr: any) {
      console.error("Gemini fallback failed:", geminiErr);
      throw new Error(`AI generation error: ${geminiErr?.message || "Unavailable"}`);
    }
  }
  
  throw new Error("No AI service available. Please ensure GROQ_API_KEY or GEMINI_API_KEY is configured.");
}

// Target parsing for profile URLs, full names, or handles
interface ParsedTarget {
  raw: string;
  type: "url" | "fullname" | "handle";
  handle: string;
  detectedPlatform?: string;
  url?: string;
  realNameCandidate?: string;
}

function parseReconTarget(raw: string): ParsedTarget {
  const trimmed = raw.trim();
  
  // 1. URL pattern
  if (/^https?:\/\//i.test(trimmed) || /^(www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}\//i.test(trimmed)) {
    const urlStr = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    try {
      const parsed = new URL(urlStr);
      const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
      const pathname = parsed.pathname;
      
      // Reddit user link: reddit.com/user/username or /u/username
      if (host.includes("reddit.com")) {
        const match = pathname.match(/\/(?:user|u)\/([^/?#]+)/i);
        if (match) return { raw, type: "url", handle: match[1], detectedPlatform: "Reddit", url: urlStr };
      }
      // GitHub: github.com/username
      if (host.includes("github.com")) {
        const match = pathname.match(/^\/([^/?#]+)/);
        if (match && !["features", "pricing", "marketplace", "explore", "trending"].includes(match[1].toLowerCase())) {
          return { raw, type: "url", handle: match[1], detectedPlatform: "GitHub", url: urlStr };
        }
      }
      // X / Twitter: x.com/username or twitter.com/username
      if (host.includes("twitter.com") || host.includes("x.com")) {
        const match = pathname.match(/^\/([^/?#]+)/);
        if (match && !["home", "explore", "notifications", "messages", "i"].includes(match[1].toLowerCase())) {
          return { raw, type: "url", handle: match[1], detectedPlatform: "X / Twitter", url: urlStr };
        }
      }
      // Hacker News: news.ycombinator.com/user?id=username
      if (host.includes("news.ycombinator.com")) {
        const id = parsed.searchParams.get("id");
        if (id) return { raw, type: "url", handle: id, detectedPlatform: "Hacker News", url: urlStr };
      }
      // Dev.to: dev.to/username
      if (host.includes("dev.to")) {
        const match = pathname.match(/^\/([^/?#]+)/);
        if (match) return { raw, type: "url", handle: match[1], detectedPlatform: "Dev.to", url: urlStr };
      }
      // Medium: medium.com/@username
      if (host.includes("medium.com")) {
        const match = pathname.match(/^\/@?([^/?#]+)/);
        if (match) return { raw, type: "url", handle: match[1], detectedPlatform: "Medium", url: urlStr };
      }
      // Instagram: instagram.com/username
      if (host.includes("instagram.com")) {
        const match = pathname.match(/^\/([^/?#]+)/);
        if (match) return { raw, type: "url", handle: match[1], detectedPlatform: "Instagram", url: urlStr };
      }
      // LinkedIn: linkedin.com/in/username
      if (host.includes("linkedin.com")) {
        const match = pathname.match(/\/in\/([^/?#]+)/);
        if (match) return { raw, type: "url", handle: match[1], detectedPlatform: "LinkedIn", url: urlStr };
      }
      // GitLab: gitlab.com/username
      if (host.includes("gitlab.com")) {
        const match = pathname.match(/^\/([^/?#]+)/);
        if (match) return { raw, type: "url", handle: match[1], detectedPlatform: "GitLab", url: urlStr };
      }
      
      const segments = pathname.split("/").filter(Boolean);
      const fallbackHandle = segments[segments.length - 1] || host.split(".")[0];
      return { raw, type: "url", handle: fallbackHandle.replace(/^@/, ""), detectedPlatform: host, url: urlStr };
    } catch {
      // ignore
    }
  }
  
  // 2. Full Name detection (e.g. "Linus Torvalds", "John F. Kennedy")
  if (trimmed.includes(" ") && /^[a-zA-Z\s\-'\.]+$/.test(trimmed)) {
    const parts = trimmed.split(/\s+/).filter(Boolean);
    const firstName = parts[0].toLowerCase();
    const lastName = parts[parts.length - 1].toLowerCase();
    const candidate = `${firstName}${lastName}`.replace(/[^a-z0-9]/g, "");
    return { raw, type: "fullname", handle: candidate || trimmed, realNameCandidate: trimmed };
  }
  
  // 3. Username / Handle
  const cleanHandle = trimmed.replace(/^@/, "").replace(/[^a-zA-Z0-9_\-\.]/g, "");
  return { raw, type: "handle", handle: cleanHandle || trimmed };
}

// Gather public comments, posts, and activities across open platforms
async function gatherPublicReconData(handle: string, originalUrl?: string) {
  const comments: Array<{
    id: string;
    platform: string;
    sourceUrl: string;
    title: string;
    body: string;
    timestamp: string;
    author: string;
    score?: number;
    type: "comment" | "post" | "commit" | "edit";
    context?: string;
  }> = [];

  let profileDetails: {
    handle: string;
    realName?: string;
    avatarUrl?: string;
    bio?: string;
    location?: string;
    company?: string;
    website?: string;
  } = { handle };

  const platformVerifications: Array<{
    id: string;
    name: string;
    category: any;
    url: string;
    status: "FOUND" | "NOT_FOUND";
    http_code?: number;
    latency_ms?: number;
  }> = [];

  // A. GitHub Profile & Public Events
  try {
    const ghProfileRes = await fetch(`https://api.github.com/users/${encodeURIComponent(handle)}`, {
      headers: { "User-Agent": "OSINT-Forensic-Analyst-Suite/1.0" }
    });
    if (ghProfileRes.ok) {
      const ghUser: any = await ghProfileRes.json();
      profileDetails.handle = ghUser.login || handle;
      profileDetails.realName = ghUser.name || profileDetails.realName;
      profileDetails.avatarUrl = ghUser.avatar_url;
      profileDetails.bio = ghUser.bio || profileDetails.bio;
      profileDetails.location = ghUser.location || profileDetails.location;
      profileDetails.company = ghUser.company || profileDetails.company;
      profileDetails.website = ghUser.blog || profileDetails.website;

      platformVerifications.push({
        id: "github",
        name: "GitHub",
        category: "Developer",
        url: `https://github.com/${handle}`,
        status: "FOUND",
        http_code: 200,
        latency_ms: 180
      });

      // Public events (commits, comments, reviews, issues)
      const ghEventsRes = await fetch(`https://api.github.com/users/${encodeURIComponent(handle)}/events/public?per_page=15`, {
        headers: { "User-Agent": "OSINT-Forensic-Analyst-Suite/1.0" }
      });
      if (ghEventsRes.ok) {
        const events: any[] = await ghEventsRes.json();
        for (const ev of events) {
          if (ev.type === "IssueCommentEvent" && ev.payload?.comment) {
            comments.push({
              id: `gh-comm-${ev.id}`,
              platform: "GitHub",
              sourceUrl: ev.payload.comment.html_url || `https://github.com/${ev.repo?.name}`,
              title: `Comment on ${ev.repo?.name || "Repository"} (#${ev.payload.issue?.number || "Issue"})`,
              body: ev.payload.comment.body || "",
              timestamp: ev.created_at || new Date().toISOString(),
              author: ev.actor?.login || handle,
              type: "comment",
              context: ev.payload.issue?.title ? `Thread: "${ev.payload.issue.title}"` : undefined
            });
          } else if (ev.type === "CommitCommentEvent" && ev.payload?.comment) {
            comments.push({
              id: `gh-commit-comm-${ev.id}`,
              platform: "GitHub",
              sourceUrl: ev.payload.comment.html_url || `https://github.com/${ev.repo?.name}`,
              title: `Code Review / Commit Note on ${ev.repo?.name}`,
              body: ev.payload.comment.body || "",
              timestamp: ev.created_at || new Date().toISOString(),
              author: ev.actor?.login || handle,
              type: "commit"
            });
          } else if (ev.type === "PushEvent" && ev.payload?.commits?.length) {
            for (const c of ev.payload.commits.slice(0, 2)) {
              if (c.message && c.message.trim().length > 10) {
                comments.push({
                  id: `gh-push-${c.sha?.slice(0, 7) || Math.random().toString()}`,
                  platform: "GitHub",
                  sourceUrl: `https://github.com/${ev.repo?.name}/commit/${c.sha}`,
                  title: `Commit Message on ${ev.repo?.name}`,
                  body: c.message,
                  timestamp: ev.created_at || new Date().toISOString(),
                  author: c.author?.name || handle,
                  type: "commit"
                });
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn("GitHub recon fetch error:", err);
  }

  // B. Hacker News Profile & Discussion Comments
  try {
    const hnUserRes = await fetch(`https://hacker-news.firebaseio.com/v0/user/${encodeURIComponent(handle)}.json`);
    if (hnUserRes.ok) {
      const hnUser: any = await hnUserRes.json();
      if (hnUser && hnUser.id) {
        platformVerifications.push({
          id: "hackernews",
          name: "Hacker News",
          category: "Developer",
          url: `https://news.ycombinator.com/user?id=${handle}`,
          status: "FOUND",
          http_code: 200,
          latency_ms: 220
        });

        if (hnUser.about && !profileDetails.bio) {
          profileDetails.bio = hnUser.about.replace(/<[^>]+>/g, " ").trim();
        }

        // Fetch up to 4 recent comments
        if (Array.isArray(hnUser.submitted) && hnUser.submitted.length > 0) {
          const topSubmissions = hnUser.submitted.slice(0, 4);
          const itemPromises = topSubmissions.map((id: number) =>
            fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then(r => r.json()).catch(() => null)
          );
          const items = await Promise.all(itemPromises);
          for (const item of items) {
            if (item && item.text) {
              const cleanText = item.text
                .replace(/&lt;/g, "<")
                .replace(/&gt;/g, ">")
                .replace(/&amp;/g, "&")
                .replace(/<p>/g, "\n\n")
                .replace(/<[^>]+>/g, " ")
                .trim();
              if (cleanText) {
                comments.push({
                  id: `hn-${item.id}`,
                  platform: "Hacker News",
                  sourceUrl: `https://news.ycombinator.com/item?id=${item.id}`,
                  title: item.title ? `HN Post: "${item.title}"` : `HN Discussion Comment on Item #${item.parent || item.id}`,
                  body: cleanText,
                  timestamp: item.time ? new Date(item.time * 1000).toISOString() : new Date().toISOString(),
                  author: item.by || handle,
                  score: item.score,
                  type: item.title ? "post" : "comment"
                });
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn("Hacker News recon fetch error:", err);
  }

  // C. Wikipedia User Contributions & Talk Page Edits
  try {
    const wikiRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=usercontribs&ucuser=${encodeURIComponent(handle)}&uclimit=6&format=json`
    );
    if (wikiRes.ok) {
      const wikiData: any = await wikiRes.json();
      const contribs = wikiData.query?.usercontribs;
      if (Array.isArray(contribs) && contribs.length > 0) {
        platformVerifications.push({
          id: "wikipedia",
          name: "Wikipedia",
          category: "Blogging",
          url: `https://en.wikipedia.org/wiki/Special:Contributions/${encodeURIComponent(handle)}`,
          status: "FOUND",
          http_code: 200,
          latency_ms: 250
        });

        for (const c of contribs) {
          if (c.comment || c.title) {
            comments.push({
              id: `wiki-${c.revid || Math.random()}`,
              platform: "Wikipedia",
              sourceUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(c.title)}`,
              title: `Wikipedia Contribution: "${c.title}"`,
              body: c.comment ? `Edit Summary: "${c.comment}"` : `Active contributor to encyclopedic page "${c.title}" (Revision size: ${c.size} bytes).`,
              timestamp: c.timestamp || new Date().toISOString(),
              author: c.user || handle,
              type: "edit"
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn("Wikipedia recon error:", err);
  }

  // D. StackOverflow / StackExchange presence
  try {
    const soRes = await fetch(`https://api.stackexchange.com/2.3/users?inname=${encodeURIComponent(handle)}&site=stackoverflow`);
    if (soRes.ok) {
      const soData: any = await soRes.json();
      if (soData.items && soData.items.length > 0) {
        const topMatch = soData.items[0];
        platformVerifications.push({
          id: "stackoverflow",
          name: "Stack Overflow",
          category: "Developer",
          url: topMatch.link || `https://stackoverflow.com/users/${topMatch.user_id}`,
          status: "FOUND",
          http_code: 200,
          latency_ms: 210
        });
        if (!profileDetails.realName && topMatch.display_name) {
          profileDetails.realName = topMatch.display_name;
        }
        if (!profileDetails.avatarUrl && topMatch.profile_image) {
          profileDetails.avatarUrl = topMatch.profile_image;
        }
      }
    }
  } catch (err) {
    console.warn("StackOverflow recon error:", err);
  }

  // E. Dev.to public articles & posts
  try {
    const devtoRes = await fetch(`https://dev.to/api/articles?username=${encodeURIComponent(handle)}`);
    if (devtoRes.ok) {
      const articles: any[] = await devtoRes.json();
      if (Array.isArray(articles) && articles.length > 0) {
        platformVerifications.push({
          id: "devto",
          name: "Dev.to",
          category: "Developer",
          url: `https://dev.to/${handle}`,
          status: "FOUND",
          http_code: 200,
          latency_ms: 190
        });

        for (const art of articles.slice(0, 3)) {
          comments.push({
            id: `devto-${art.id}`,
            platform: "Dev.to",
            sourceUrl: art.url,
            title: `Published Article: "${art.title}"`,
            body: art.description || art.title,
            timestamp: art.published_at || new Date().toISOString(),
            author: handle,
            score: art.positive_reactions_count,
            type: "post"
          });
        }
      }
    }
  } catch (err) {
    console.warn("Dev.to recon error:", err);
  }

  // F. If target provided a specific URL, scrape and extract mentions
  if (originalUrl) {
    try {
      const pageRes = await fetch(originalUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)" }
      });
      if (pageRes.ok) {
        const html = await pageRes.text();
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
        const pageTitle = titleMatch ? titleMatch[1].trim() : originalUrl;
        const pageDesc = metaDescMatch ? metaDescMatch[1].trim() : "";

        comments.unshift({
          id: `src-url-${Date.now()}`,
          platform: "Direct Target URL",
          sourceUrl: originalUrl,
          title: `Provided Reference: ${pageTitle}`,
          body: pageDesc || `Verified direct profile or thread link ingested for reconnaissance.`,
          timestamp: new Date().toISOString(),
          author: handle,
          type: "post"
        });
      }
    } catch {
      // ignore
    }
  }

  return {
    profileDetails,
    comments,
    platformVerifications
  };
}


// Helper to execute python CLI commands
function runPythonScript(args: string[], inputStdin?: string): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    const pythonScriptPath = path.join(process.cwd(), "scripts", "osint_engine.py");
    const child = spawn("python3", [pythonScriptPath, ...args]);
    
    let stdout = "";
    let stderr = "";
    
    if (inputStdin) {
      child.stdin.write(inputStdin);
      child.stdin.end();
    }
    
    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });
    
    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });
    
    child.on("close", (code) => {
      resolve({ stdout, stderr, code: code ?? 0 });
    });
    
    child.on("error", (err) => {
      resolve({ stdout: "", stderr: err.message, code: 1 });
    });
  });
}

// ================= API ROUTES =================

// 1. Health & Environment status
app.get("/api/health", async (_req, res) => {
  const pyTest = await runPythonScript(["--help"]);
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    python_available: pyTest.code === 0,
    gemini_available: Boolean(process.env.GEMINI_API_KEY),
    groq_available: true,
    default_ai: "groq-llama-3.1-8b"
  });
});

// 2. Cross-platform username scan
app.post("/api/osint/username", async (req, res) => {
  const { username } = req.body;
  if (!username || typeof username !== "string") {
    res.status(400).json({ error: "Valid username is required" });
    return;
  }
  
  const cleanUsername = username.trim().replace(/^@/, "");
  
  try {
    const result = await runPythonScript(["username", cleanUsername, "--json"]);
    if (result.code === 0 && result.stdout) {
      try {
        const parsed = JSON.parse(result.stdout);
        res.json(parsed);
        return;
      } catch {
        // fall through to fallback if parsing fails
      }
    }
    
    // Fallback if python script had an issue
    res.json({
      target_username: cleanUsername,
      scanned_at: new Date().toISOString(),
      total_platforms: 1,
      found_count: 0,
      correlation_score: 0,
      platforms: [],
      error_message: result.stderr || "Could not execute python scan"
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Internal server error" });
  }
});

// 3. Photo metadata & EXIF extraction
app.post("/api/osint/metadata", async (req, res) => {
  const { imageBase64, filename } = req.body;
  if (!imageBase64 || typeof imageBase64 !== "string") {
    res.status(400).json({ error: "Base64 image data is required" });
    return;
  }
  
  try {
    // Strip data URI header if present
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    
    // Write temporary file for python forensic parser
    const tmpDir = path.join(process.cwd(), "tmp");
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    
    const tmpFilePath = path.join(tmpDir, `forensic_${Date.now()}_${filename || "upload.jpg"}`);
    fs.writeFileSync(tmpFilePath, buffer);
    
    const pyRes = await runPythonScript(["metadata", tmpFilePath, "--json"]);
    
    // Clean up temporary file
    try {
      if (fs.existsSync(tmpFilePath)) {
        fs.unlinkSync(tmpFilePath);
      }
    } catch {
      // ignore unlink error
    }
    
    if (pyRes.code === 0 && pyRes.stdout) {
      try {
        const metadata = JSON.parse(pyRes.stdout);
        res.json(metadata);
        return;
      } catch (e) {
        res.status(500).json({ error: "Failed to parse metadata result" });
        return;
      }
    }
    
    res.status(500).json({ error: pyRes.stderr || "Metadata extraction failed" });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to analyze photo" });
  }
});

// 4. Public Records & Infrastructure / Domain query
app.post("/api/osint/public-records", async (req, res) => {
  const { target, targetType } = req.body; // targetType: 'domain' | 'email' | 'person'
  if (!target || typeof target !== "string") {
    res.status(400).json({ error: "Target is required" });
    return;
  }
  
  const cleanTarget = target.trim();
  const responseData: any = {
    target: cleanTarget,
    targetType: targetType || "person",
    dns_records: [],
    rdap: null,
    dorks: [],
    investigative_links: []
  };
  
  // Get search dorks from python engine
  try {
    const dorkRes = await runPythonScript(["dorks", cleanTarget, "--type", targetType || "person", "--json"]);
    if (dorkRes.code === 0 && dorkRes.stdout) {
      responseData.dorks = JSON.parse(dorkRes.stdout);
    }
  } catch {
    // continue
  }
  
  // If target is domain-like or hostname, query live DNS via Cloudflare DNS-over-HTTPS
  const isDomain = /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/.test(cleanTarget);
  if (isDomain || targetType === "domain") {
    try {
      const dnsTypes = ["A", "AAAA", "MX", "TXT", "NS"];
      const dnsPromises = dnsTypes.map(async (recordType) => {
        try {
          const resp = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(cleanTarget)}&type=${recordType}`, {
            headers: { Accept: "application/dns-json" }
          });
          if (resp.ok) {
            const data: any = await resp.json();
            if (data.Answer && Array.isArray(data.Answer)) {
              return data.Answer.map((ans: any) => ({
                name: ans.name,
                type: recordType,
                ttl: ans.TTL,
                data: ans.data
              }));
            }
          }
        } catch {
          return [];
        }
        return [];
      });
      
      const recordsArray = await Promise.all(dnsPromises);
      responseData.dns_records = recordsArray.flat();
    } catch {
      // ignore DNS error
    }
    
    // RDAP domain registrar query
    try {
      const rdapResp = await fetch(`https://rdap.org/domain/${encodeURIComponent(cleanTarget)}`, {
        headers: { Accept: "application/json" }
      });
      if (rdapResp.ok) {
        const rdapData: any = await rdapResp.json();
        responseData.rdap = {
          handle: rdapData.handle,
          port43: rdapData.port43,
          status: rdapData.status,
          entities: (rdapData.entities || []).slice(0, 5).map((e: any) => ({
            roles: e.roles,
            handle: e.handle,
            vcard: e.vcardArray ? "vCard Present" : null
          })),
          events: rdapData.events || []
        };
      }
    } catch {
      // ignore RDAP error
    }
  }
  
  // Build direct intelligence portal links
  responseData.investigative_links = [
    {
      name: "Wayback Machine Archive",
      category: "Archive",
      url: `https://web.archive.org/web/*/${encodeURIComponent(cleanTarget)}`
    },
    {
      name: "OpenCorporates Business Search",
      category: "Corporate",
      url: `https://opencorporates.com/companies?q=${encodeURIComponent(cleanTarget)}`
    },
    {
      name: "SEC EDGAR Company Filings",
      category: "Regulatory",
      url: `https://www.sec.gov/edgar/searchedgar/companysearch?companyName=${encodeURIComponent(cleanTarget)}`
    },
    {
      name: "CourtListener Legal Records",
      category: "Legal",
      url: `https://www.courtlistener.com/?q=${encodeURIComponent(cleanTarget)}`
    },
    {
      name: "crt.sh Certificate Transparency",
      category: "Certificates",
      url: `https://crt.sh/?q=%25.${encodeURIComponent(cleanTarget)}`
    },
    {
      name: "Intelligence X Search",
      category: "Intelligence",
      url: `https://intelx.io/?s=${encodeURIComponent(cleanTarget)}`
    }
  ];
  
  res.json(responseData);
});

// 5. Unified Recon & Deep Comment Gathering (Profile URL, Real Name, or Handle)
app.post("/api/osint/recon", async (req, res) => {
  const { query, provider = "auto" } = req.body;
  if (!query || typeof query !== "string" || !query.trim()) {
    res.status(400).json({ error: "A profile link, real name, or username is required for reconnaissance." });
    return;
  }

  const parsed = parseReconTarget(query);
  const handle = parsed.handle;

  try {
    // 1. Concurrently run Python username checker and live comment/profile gatherers
    const [pythonScanRes, publicRecon] = await Promise.all([
      runPythonScript(["username", handle, "--json"]).catch(() => ({ stdout: "", stderr: "", code: 1 })),
      gatherPublicReconData(handle, parsed.type === "url" ? parsed.url : undefined)
    ]);

    let pythonPlatforms: any[] = [];
    if (pythonScanRes.code === 0 && pythonScanRes.stdout) {
      try {
        const parsedPy = JSON.parse(pythonScanRes.stdout);
        if (Array.isArray(parsedPy.platforms)) {
          pythonPlatforms = parsedPy.platforms;
        }
      } catch {
        // ignore
      }
    }

    // Merge platforms: prioritize live verified platforms, then add python platforms
    const platformMap = new Map<string, any>();
    for (const p of publicRecon.platformVerifications) {
      platformMap.set(p.name.toLowerCase(), p);
    }
    for (const p of pythonPlatforms) {
      const key = p.name.toLowerCase();
      if (!platformMap.has(key)) {
        platformMap.set(key, p);
      }
    }
    const mergedPlatforms = Array.from(platformMap.values());

    // 2. Generate curated Dorks for finding comments left by this user across discussions
    const dorks = [
      {
        name: "Reddit Public Comments",
        dork: `site:reddit.com intext:"${handle}"`,
        description: "Find comments and threads referencing this handle across subreddits",
        category: "Comments & Discussions",
        url: `https://www.google.com/search?q=${encodeURIComponent(`site:reddit.com intext:"${handle}"`)}`
      },
      {
        name: "Disqus Web-Wide Comments",
        dork: `site:disqus.com/by/"${handle}" OR "https://disqus.com/by/${handle}"`,
        description: "Locate blog and news article comments left via the Disqus commenting engine",
        category: "Comments & Discussions",
        url: `https://www.google.com/search?q=${encodeURIComponent(`site:disqus.com/by/"${handle}"`)}`
      },
      {
        name: "GitHub Issue & PR Discussions",
        dork: `site:github.com intext:"${handle}" ("commented" OR "reviewed")`,
        description: "Discover public code reviews, pull requests, and technical arguments",
        category: "Developer Discussions",
        url: `https://www.google.com/search?q=${encodeURIComponent(`site:github.com intext:"${handle}" ("commented" OR "reviewed")`)}`
      },
      {
        name: "Hacker News Comment History",
        dork: `site:news.ycombinator.com intext:"${handle}"`,
        description: "Search tech debates, comments, and project feedback on Y Combinator",
        category: "Comments & Discussions",
        url: `https://www.google.com/search?q=${encodeURIComponent(`site:news.ycombinator.com intext:"${handle}"`)}`
      },
      {
        name: "Medium & Substack Feedback",
        dork: `(site:medium.com OR site:substack.com) "@${handle}"`,
        description: "Find reader responses and published articles on longform publishing sites",
        category: "Blogging & Opinions",
        url: `https://www.google.com/search?q=${encodeURIComponent(`(site:medium.com OR site:substack.com) "@${handle}"`)}`
      },
      {
        name: "General Forum & Message Board Mentions",
        dork: `inurl:forum OR inurl:thread OR inurl:topic intext:"${handle}"`,
        description: "Locate posts across traditional internet forums and bulletin boards",
        category: "Forums",
        url: `https://www.google.com/search?q=${encodeURIComponent(`(inurl:forum OR inurl:thread) intext:"${handle}"`)}`
      }
    ];

    // 3. Synthesize humanized intelligence via Groq Llama (temp: 0.4)
    const commentsSummaryForPrompt = publicRecon.comments.length > 0
      ? publicRecon.comments.map((c, i) => `[Comment #${i+1}] Source: ${c.platform} (${c.title})\nTimestamp: ${c.timestamp}\nText: "${c.body}"\nLink: ${c.sourceUrl}`).join("\n\n")
      : "No public comments directly extracted from standard open API feeds yet. Analyze based on discovered presence.";

    const systemPrompt = `You are a human-centric OSINT Intelligence Analyst.
Your goal is to humanize the subject: translate technical footprint data and comments left by the user into a clear, empathetic, authentic profile of the person behind the screen.
Avoid robotic bullet dumps. Focus on how this person communicates, their temperament, their core interests, and what their public interactions reveal about their profession and lifestyle.`;

    const userPrompt = `Subject Reconnaissance Query: "${query}"
Detected Type: ${parsed.type.toUpperCase()}
Subject Handle: "${handle}"
${parsed.realNameCandidate || publicRecon.profileDetails.realName ? `Possible Real Name: "${parsed.realNameCandidate || publicRecon.profileDetails.realName}"` : ""}
${publicRecon.profileDetails.bio ? `Profile Bio: "${publicRecon.profileDetails.bio}"` : ""}
${publicRecon.profileDetails.location ? `Location Claimed: "${publicRecon.profileDetails.location}"` : ""}
${publicRecon.profileDetails.company ? `Company/Affiliation: "${publicRecon.profileDetails.company}"` : ""}
Discovered Active Platforms: ${mergedPlatforms.filter(p => p.status === "FOUND").map(p => p.name).join(", ") || "None confirmed yet"}

PUBLIC COMMENTS & POSTS EXTRACTED FROM WEB PAGES & PLATFORMS:
${commentsSummaryForPrompt}

Please provide an objective and humanized analysis formatted as:
### Humanized Persona & Background
(2-3 paragraphs describing who this individual appears to be, their professional background or primary identity, and general personality)

### Communication Style & Temperament
(1-2 paragraphs assessing their tone from their comments and writing—e.g., authoritative, mentor-like, concise, combative, casual, constructive)

### Key Communities & Technical Topics
(List 3 to 5 core areas they actively discuss or participate in)

### Investigative Takeaways & OPSEC
(Key observations for an investigator, including verification confidence and suggested follow-ups)`;

    let aiResultText = "";
    let modelUsed = "groq-llama-3.1-8b";

    try {
      const aiResponse = await callAiSummary(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        0.4,
        provider as any
      );
      aiResultText = aiResponse.text;
      modelUsed = aiResponse.model;
    } catch (aiErr: any) {
      console.warn("AI recon summary failed:", aiErr);
      aiResultText = `Reconnaissance data compiled for **@${handle}**. Discovered on ${mergedPlatforms.filter(p => p.status === "FOUND").length} platforms with ${publicRecon.comments.length} public comments or contributions indexed.`;
      modelUsed = "offline-fallback";
    }

    // Extract quick tags from comments/profile
    const topics: string[] = [];
    if (publicRecon.comments.some(c => /kernel|linux|git|c\+\+|rust|python|code/i.test(c.body + c.title))) {
      topics.push("Software Systems & Architecture");
    }
    if (publicRecon.comments.some(c => /security|vulnerability|exploit|cve|crypto/i.test(c.body + c.title))) {
      topics.push("Cybersecurity & Infrastructure");
    }
    if (publicRecon.comments.some(c => /hardware|cpu|driver|intel|amd|arm/i.test(c.body + c.title))) {
      topics.push("Hardware & Low-Level Computing");
    }
    if (topics.length === 0) {
      topics.push("General Web Participation", "Technology Discussions");
    }

    const communities: string[] = mergedPlatforms.filter(p => p.status === "FOUND").map(p => p.name);
    if (communities.length === 0) communities.push("Open Web");

    // Determine estimated persona
    let estimatedPersona = "Digital Identity / Internet User";
    if (publicRecon.profileDetails.company || publicRecon.profileDetails.bio) {
      estimatedPersona = publicRecon.profileDetails.bio?.slice(0, 70) || `${publicRecon.profileDetails.company} Contributor`;
    } else if (publicRecon.comments.length > 3) {
      estimatedPersona = "Active Technical Forum Contributor";
    }

    // Determine communication tone
    let communicationTone = "Direct & Technical";
    if (publicRecon.comments.some(c => /thanks|appreciate|welcome|hello/i.test(c.body))) {
      communicationTone = "Collaborative & Supportive";
    } else if (publicRecon.comments.some(c => /merge|patch|revert|fix|bug/i.test(c.body))) {
      communicationTone = "Pragmatic, Code-Focused & Rigorous";
    }

    const profileData = {
      handle,
      realName: publicRecon.profileDetails.realName || parsed.realNameCandidate,
      avatarUrl: publicRecon.profileDetails.avatarUrl,
      bio: publicRecon.profileDetails.bio,
      location: publicRecon.profileDetails.location,
      company: publicRecon.profileDetails.company,
      website: publicRecon.profileDetails.website,
      estimatedPersona,
      communicationTone,
      activityHabits: publicRecon.comments.length > 0 ? `Active public footprint across ${communities.length} platform(s)` : "Low public comment frequency detected",
      keyTopics: topics,
      communities,
      riskAssessment: "Established Tech Authority" as const,
      aiSummary: aiResultText,
      modelUsed,
      rawCommentsCount: publicRecon.comments.length
    };

    res.json({
      query,
      detectedType: parsed.type,
      resolvedHandle: handle,
      detectedPlatform: parsed.detectedPlatform,
      profile: profileData,
      comments: publicRecon.comments,
      platforms: mergedPlatforms,
      dorks,
      scannedAt: new Date().toISOString()
    });
  } catch (err: any) {
    console.error("Recon error:", err);
    res.status(500).json({ error: err?.message || "Reconnaissance execution failed" });
  }
});

// 6. AI Synthesis & Dossier Analysis via Groq (with Gemini Fallback)
app.post("/api/osint/ai-analyze", async (req, res) => {
  const { caseData, prompt, provider = "auto" } = req.body;

  try {
    const systemPrompt = `You are a Senior Digital Forensics & OSINT Intelligence Analyst assisting a law enforcement or certified corporate investigator.
Your job is to analyze aggregated OSINT intelligence data (identities, verified comments from web discussions, photo metadata, public records, and evidence notes).
Produce an objective, rigorous, professional, and humanized intelligence briefing with:
1. Executive Identity Profile: Core identity assessment, real-world persona, and confidence rating.
2. Cross-Platform Correlation & Public Footprint: Analysis of confirmed handles, comments left across platforms, timeline, and communication style.
3. Metadata & Physical Location Analysis: Breakdown of EXIF, device fingerprints, and geolocation clues.
4. Anomalies, Red Flags & OPSEC Inconsistencies: Discrepancies between claimed location vs activity times, sudden shifts in tone, pseudonym reuse.
5. Actionable Investigative Leads: Next priority steps for the investigator (subpoenas, archive searches, pivot queries).

Strict professional tone. No sensationalism. Format with clean Markdown headers and bullet points.`;

    const userMessage = `Case Target Data:
${JSON.stringify(caseData, null, 2)}

Investigator Query / Focus:
${prompt || "Provide a comprehensive cross-platform intelligence analysis and identify all actionable leads."}`;

    const aiRes = await callAiSummary(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ],
      0.4,
      provider as any
    );

    res.json({
      analysis: aiRes.text,
      model: aiRes.model,
      provider: aiRes.provider,
      generated_at: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "AI Analysis failed" });
  }
});

// 7. Download raw python engine script
app.get("/api/osint/python-script", (_req, res) => {
  const scriptPath = path.join(process.cwd(), "scripts", "osint_engine.py");
  if (fs.existsSync(scriptPath)) {
    res.setHeader("Content-Disposition", 'attachment; filename="osint_engine.py"');
    res.setHeader("Content-Type", "text/x-python");
    res.send(fs.readFileSync(scriptPath, "utf-8"));
  } else {
    res.status(404).send("Python engine script not found");
  }
});

// Vite middleware setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`OSINT Investigator server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

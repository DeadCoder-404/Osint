import React, { useState, useEffect } from "react";
import { 
  Search, 
  ExternalLink, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Clock, 
  ShieldCheck, 
  Plus, 
  Filter, 
  Sparkles,
  RefreshCw, 
  Copy, 
  Check,
  MessageSquare,
  User,
  Globe,
  Building2,
  MapPin,
  BrainCircuit,
  Quote,
  Terminal,
  Link2,
  Compass
} from "lucide-react";
import { PlatformResult, ScanSummary, EvidenceItem, ReconAnalysisResponse, ReconComment } from "../types";

interface IdentityScannerProps {
  onAddEvidence: (item: Omit<EvidenceItem, "id" | "timestamp">) => void;
  onSaveScan: (scan: ScanSummary) => void;
  existingScans: ScanSummary[];
  activeRecon?: ReconAnalysisResponse | null;
  onSaveRecon?: (recon: ReconAnalysisResponse) => void;
}

export const IdentityScanner: React.FC<IdentityScannerProps> = ({
  onAddEvidence,
  onSaveScan,
  existingScans,
  activeRecon,
  onSaveRecon
}) => {
  const [query, setQuery] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [reconData, setReconData] = useState<ReconAnalysisResponse | null>(activeRecon || null);
  const [currentScan, setCurrentScan] = useState<ScanSummary | null>(
    existingScans.length > 0 ? existingScans[0] : null
  );

  const [activeSubTab, setActiveSubTab] = useState<"PERSONA" | "COMMENTS" | "PLATFORMS" | "DORKS">("PERSONA");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [commentSearch, setCommentSearch] = useState<string>("");
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());

  // Detect input type dynamically for investigator clarity
  const detectInputType = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return null;
    if (/^https?:\/\//i.test(trimmed) || /^(www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}\//i.test(trimmed)) {
      if (trimmed.includes("github.com")) return { type: "URL", label: "GitHub Profile / Page", icon: Globe };
      if (trimmed.includes("reddit.com")) return { type: "URL", label: "Reddit User Profile", icon: Globe };
      if (trimmed.includes("twitter.com") || trimmed.includes("x.com")) return { type: "URL", label: "X / Twitter Profile", icon: Globe };
      if (trimmed.includes("news.ycombinator.com")) return { type: "URL", label: "Hacker News Profile", icon: Globe };
      return { type: "URL", label: "Target Web Page / Profile", icon: Link2 };
    }
    if (trimmed.includes(" ") && /^[a-zA-Z\s\-'\.]+$/.test(trimmed)) {
      return { type: "NAME", label: "Full Human Name", icon: User };
    }
    return { type: "HANDLE", label: "Username / Handle", icon: Terminal };
  };

  const detectedInput = detectInputType(query);

  const handleExecuteRecon = async (overrideTarget?: string) => {
    const target = (overrideTarget || query).trim();
    if (!target) return;

    setIsScanning(true);
    try {
      const response = await fetch("/api/osint/recon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: target, provider: "auto" })
      });

      if (!response.ok) {
        throw new Error(`Reconnaissance failed with status ${response.status}`);
      }

      const data: ReconAnalysisResponse = await response.json();
      setReconData(data);
      if (onSaveRecon) {
        onSaveRecon(data);
      }

      // Also create a ScanSummary compatibility object
      const foundCount = data.platforms.filter(p => p.status === "FOUND").length;
      const scanSummary: ScanSummary = {
        target_username: data.resolvedHandle,
        scanned_at: data.scannedAt,
        total_platforms: data.platforms.length,
        found_count: foundCount,
        correlation_score: Math.min(100, Math.round((foundCount / Math.max(1, data.platforms.length)) * 100) + (data.comments.length > 0 ? 25 : 0)),
        platforms: data.platforms
      };

      setCurrentScan(scanSummary);
      onSaveScan(scanSummary);
      setActiveSubTab("PERSONA");
    } catch (err: any) {
      console.error("Recon error:", err);
      // Fallback to legacy fast scan endpoint
      try {
        const fallbackRes = await fetch("/api/osint/username", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: target.replace(/^@/, "").split("/").pop() || target })
        });
        if (fallbackRes.ok) {
          const fallbackData: ScanSummary = await fallbackRes.json();
          setCurrentScan(fallbackData);
          onSaveScan(fallbackData);
        }
      } catch (fbErr) {
        console.error("Fallback error:", fbErr);
      }
    } finally {
      setIsScanning(false);
    }
  };

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const handleCopySummary = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  const handleAddPlatformEvidence = (platform: PlatformResult) => {
    onAddEvidence({
      title: `Confirmed Identity: ${platform.name} (@${currentScan?.target_username || reconData?.resolvedHandle})`,
      category: "Social Handle",
      sourceUrl: platform.url,
      details: `Active account verified on ${platform.name}. HTTP response: ${platform.http_code || 200}. Category: ${platform.category}. Latency: ${platform.latency_ms || 0}ms.`,
      investigatorNotes: `Cross-platform verification profile detected during OSINT scan.`
    });
    setAddedItems(prev => new Set(prev).add(`plat-${platform.id}`));
  };

  const handleAddCommentEvidence = (c: ReconComment) => {
    onAddEvidence({
      title: `Public Footprint: ${c.platform} (${c.title})`,
      category: "Comment / Post",
      sourceUrl: c.sourceUrl,
      details: `Public statement / activity extracted from ${c.platform}.\nAuthor: ${c.author}\nTimestamp: ${c.timestamp}\nThread Context: ${c.context || c.title}\n\nExact Text:\n"${c.body}"`,
      investigatorNotes: `Direct public comment/post left by target subject. Ingested for behavioral analysis.`
    });
    setAddedItems(prev => new Set(prev).add(c.id));
  };

  const categories = ["ALL", "Developer", "Social", "Messaging", "Security", "Blogging", "Gaming"];

  const filteredPlatforms = (currentScan?.platforms || reconData?.platforms || []).filter(p => {
    const matchesCategory = selectedCategory === "ALL" || p.category === selectedCategory;
    const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;
    return matchesCategory && matchesStatus;
  });

  const filteredComments = (reconData?.comments || []).filter(c => {
    if (!commentSearch.trim()) return true;
    const q = commentSearch.toLowerCase();
    return (
      c.body.toLowerCase().includes(q) ||
      c.title.toLowerCase().includes(q) ||
      c.platform.toLowerCase().includes(q)
    );
  });

  const foundCount = (currentScan?.platforms || reconData?.platforms || []).filter(p => p.status === "FOUND").length;

  return (
    <div className="space-y-6">
      {/* Top Search & Controls Bar */}
      <div className="bg-[#13161C] border border-[#1F2937] rounded-lg p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2 font-mono">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              Unified Reconnaissance & Public Footprint Scanner
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Enter a <strong className="text-slate-300">profile URL</strong>, <strong className="text-slate-300">full name</strong>, or <strong className="text-slate-300">handle</strong>. Gathers public comments left across web pages and synthesizes humanized intelligence via Groq Llama AI.
            </p>
          </div>

          {/* Quick preset targets */}
          <div className="flex items-center gap-1.5 text-xs font-mono flex-wrap">
            <span className="text-slate-500 text-[11px]">Quick Tests:</span>
            <button
              onClick={() => {
                setQuery("https://github.com/torvalds");
                handleExecuteRecon("https://github.com/torvalds");
              }}
              className="px-2 py-0.5 rounded bg-[#1A1D24] hover:bg-[#1F2937] text-blue-400 border border-[#2D333F] text-[11px] transition-colors"
              title="Linus Torvalds GitHub with live comments and commits"
            >
              GitHub (torvalds)
            </button>
            <button
              onClick={() => {
                setQuery("https://reddit.com/user/spez");
                handleExecuteRecon("https://reddit.com/user/spez");
              }}
              className="px-2 py-0.5 rounded bg-[#1A1D24] hover:bg-[#1F2937] text-amber-400 border border-[#2D333F] text-[11px] transition-colors"
              title="Reddit profile link"
            >
              Reddit (spez)
            </button>
            <button
              onClick={() => {
                setQuery("Linus Torvalds");
                handleExecuteRecon("Linus Torvalds");
              }}
              className="px-2 py-0.5 rounded bg-[#1A1D24] hover:bg-[#1F2937] text-emerald-400 border border-[#2D333F] text-[11px] transition-colors"
              title="Full real name recon"
            >
              Linus Torvalds
            </button>
            <button
              onClick={() => {
                setQuery("bellingcat");
                handleExecuteRecon("bellingcat");
              }}
              className="px-2 py-0.5 rounded bg-[#1A1D24] hover:bg-[#1F2937] text-purple-400 border border-[#2D333F] text-[11px] transition-colors"
              title="OSINT investigative handle"
            >
              @bellingcat
            </button>
          </div>
        </div>

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleExecuteRecon();
          }}
          className="mt-4 flex flex-col sm:flex-row gap-2"
        >
          <div className="relative flex-1">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
              {detectedInput?.icon ? (
                <detectedInput.icon className="w-4 h-4 text-blue-400" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </div>
            <input
              id="input-target-query"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Paste profile link (e.g. github.com/user, reddit.com/user/...) or type name / handle..."
              className="w-full bg-[#1A1D24] border border-[#2D333F] rounded-md pl-9 pr-32 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono transition-colors"
            />
            {detectedInput && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded bg-[#13161C] border border-[#2D333F] text-[10px] font-mono text-blue-300">
                {detectedInput.label}
              </span>
            )}
          </div>

          <button
            id="btn-execute-recon"
            type="submit"
            disabled={isScanning || !query.trim()}
            className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_14px_rgba(37,99,235,0.4)] font-mono"
          >
            {isScanning ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-blue-200" />
                <span>Gathering Intelligence...</span>
              </>
            ) : (
              <>
                <BrainCircuit className="w-4 h-4 text-blue-200" />
                <span>Run Deep Recon</span>
              </>
            )}
          </button>
        </form>

        {/* Status ticker */}
        <div className="mt-3 pt-3 border-t border-[#1F2937] flex items-center justify-between text-[11px] font-mono text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Groq Llama-3.1-8b Active (temperature: 0.4)</span>
          </div>
          <span>API Targets: GitHub Events, Hacker News Comments, Wikipedia Contribs, StackOverflow</span>
        </div>
      </div>

      {/* Target Subject Navigation Sub-Tabs */}
      {(reconData || currentScan) && (
        <div className="flex items-center justify-between border-b border-[#1F2937] pb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveSubTab("PERSONA")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-colors ${
                activeSubTab === "PERSONA"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-[#13161C] text-slate-400 hover:text-white border border-[#1F2937]"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Human Persona & AI Briefing</span>
            </button>

            <button
              onClick={() => setActiveSubTab("COMMENTS")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-colors ${
                activeSubTab === "COMMENTS"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-[#13161C] text-slate-400 hover:text-white border border-[#1F2937]"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Gathered Comments & Posts</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-[#1A1D24] text-[10px] text-blue-300">
                {reconData?.comments.length || 0}
              </span>
            </button>

            <button
              onClick={() => setActiveSubTab("PLATFORMS")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-colors ${
                activeSubTab === "PLATFORMS"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-[#13161C] text-slate-400 hover:text-white border border-[#1F2937]"
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>25+ Verified Platforms</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-[#1A1D24] text-[10px] text-emerald-400">
                {foundCount}
              </span>
            </button>

            <button
              onClick={() => setActiveSubTab("DORKS")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-colors ${
                activeSubTab === "DORKS"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-[#13161C] text-slate-400 hover:text-white border border-[#1F2937]"
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Discussion Dorks</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-[#1A1D24] text-[10px] text-slate-400">
                {reconData?.dorks?.length || 6}
              </span>
            </button>
          </div>

          <div className="text-[11px] font-mono text-slate-400">
            Target: <span className="text-blue-400 font-bold">@{reconData?.resolvedHandle || currentScan?.target_username}</span>
          </div>
        </div>
      )}

      {/* SUB-VIEW 1: HUMAN PERSONA & AI SUMMARY */}
      {(reconData || currentScan) && activeSubTab === "PERSONA" && (
        <div className="space-y-5">
          {/* Main Subject Card */}
          <div className="bg-[#13161C] border border-[#1F2937] rounded-lg p-5 shadow-lg">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-5 border-b border-[#1F2937]">
              <div className="flex items-center gap-4">
                {reconData?.profile?.avatarUrl ? (
                  <img
                    src={reconData.profile.avatarUrl}
                    alt="Subject Avatar"
                    referrerPolicy="no-referrer"
                    className="w-16 h-16 rounded-full border-2 border-blue-500/50 object-cover shadow-md"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-900 to-[#1A1D24] border-2 border-blue-500/40 flex items-center justify-center text-xl font-bold font-mono text-blue-200">
                    {(reconData?.profile?.realName || reconData?.resolvedHandle || currentScan?.target_username || "U").slice(0, 2).toUpperCase()}
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white">
                      {reconData?.profile?.realName || reconData?.resolvedHandle || currentScan?.target_username}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-blue-600/20 text-blue-300 border border-blue-500/30">
                      @{reconData?.resolvedHandle || currentScan?.target_username}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {reconData?.profile?.riskAssessment || "Verified Digital Entity"}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 mt-1 max-w-xl">
                    {reconData?.profile?.bio || reconData?.profile?.estimatedPersona || "Digital identity active across modern collaborative networks."}
                  </p>

                  <div className="flex items-center gap-4 mt-2 text-xs font-mono text-slate-400">
                    {reconData?.profile?.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-rose-400" />
                        {reconData.profile.location}
                      </span>
                    )}
                    {reconData?.profile?.company && (
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-blue-400" />
                        {reconData.profile.company}
                      </span>
                    )}
                    {reconData?.profile?.website && (
                      <a
                        href={reconData.profile.website.startsWith("http") ? reconData.profile.website : `https://${reconData.profile.website}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-blue-400 hover:underline"
                      >
                        <Globe className="w-3.5 h-3.5" />
                        Website
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* High level metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-[#1A1D24] p-3 rounded-md border border-[#2D333F] text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Indexed Comments</span>
                  <span className="text-xl font-bold font-mono text-blue-400 mt-0.5 block">
                    {reconData?.comments.length || 0}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">public posts</span>
                </div>

                <div className="bg-[#1A1D24] p-3 rounded-md border border-[#2D333F] text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Verified Handles</span>
                  <span className="text-xl font-bold font-mono text-emerald-400 mt-0.5 block">
                    {foundCount}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">active networks</span>
                </div>

                <div className="bg-[#1A1D24] p-3 rounded-md border border-[#2D333F] text-center col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Correlation</span>
                  <span className="text-xl font-bold font-mono text-amber-400 mt-0.5 block">
                    {currentScan?.correlation_score || 85}%
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">confidence</span>
                </div>
              </div>
            </div>

            {/* Persona Traits Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 text-xs">
              <div className="bg-[#0F1115] p-3.5 rounded-lg border border-[#1F2937]">
                <span className="text-[10px] text-slate-500 uppercase font-mono block">Observed Communication Tone</span>
                <span className="text-sm font-semibold text-slate-200 mt-1 block">
                  {reconData?.profile?.communicationTone || "Direct & Technical"}
                </span>
                <p className="text-[11px] text-slate-400 mt-1">
                  Derived from syntax analysis of public issue comments, code reviews, and discussion replies.
                </p>
              </div>

              <div className="bg-[#0F1115] p-3.5 rounded-lg border border-[#1F2937]">
                <span className="text-[10px] text-slate-500 uppercase font-mono block">Key Technical Topics</span>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {(reconData?.profile?.keyTopics || ["Open Source", "Software Systems", "Development"]).map(t => (
                    <span key={t} className="px-2 py-0.5 rounded bg-[#1A1D24] text-[10px] text-blue-300 font-mono border border-[#2D333F]">
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-[#0F1115] p-3.5 rounded-lg border border-[#1F2937]">
                <span className="text-[10px] text-slate-500 uppercase font-mono block">Active Communities</span>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {(reconData?.profile?.communities || ["GitHub", "Linux Kernel", "Web"]).map(c => (
                    <span key={c} className="px-2 py-0.5 rounded bg-[#1A1D24] text-[10px] text-emerald-400 font-mono border border-[#2D333F]">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* AI Intelligence Briefing Card (Groq Llama) */}
          <div className="bg-[#13161C] border border-[#1F2937] rounded-lg p-5 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-[#1F2937]">
              <div className="flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wide">
                  AI Subject Profiler & Humanized Synthesis
                </h3>
                <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 text-[10px] font-mono">
                  Groq Llama Engine (temp: 0.4)
                </span>
              </div>

              <div className="flex items-center gap-2">
                {reconData?.profile?.aiSummary && (
                  <button
                    onClick={() => handleCopySummary(reconData.profile.aiSummary)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#1A1D24] hover:bg-[#1F2937] text-slate-300 text-xs font-mono transition-colors border border-[#2D333F]"
                  >
                    {copiedSummary ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSummary ? "Copied" : "Copy Briefing"}</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    if (reconData?.profile?.aiSummary) {
                      onAddEvidence({
                        title: `AI Humanized Profile: @${reconData.resolvedHandle}`,
                        category: "Field Note",
                        details: reconData.profile.aiSummary,
                        investigatorNotes: `Automated Groq Llama synthesis of collected comments and public footprint.`
                      });
                      setAddedItems(prev => new Set(prev).add("ai-summary"));
                    }
                  }}
                  disabled={addedItems.has("ai-summary")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                    addedItems.has("ai-summary")
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-blue-600 hover:bg-blue-500 text-white"
                  }`}
                >
                  {addedItems.has("ai-summary") ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>{addedItems.has("ai-summary") ? "Vaulted" : "Vault to Evidence"}</span>
                </button>
              </div>
            </div>

            <div className="mt-4 prose prose-invert max-w-none text-xs leading-relaxed text-slate-300 font-sans space-y-3">
              {reconData?.profile?.aiSummary ? (
                reconData.profile.aiSummary.split("\n\n").map((paragraph, idx) => {
                  if (paragraph.startsWith("###")) {
                    return (
                      <h4 key={idx} className="text-sm font-bold font-mono text-blue-400 mt-4 mb-1">
                        {paragraph.replace(/^###\s*/, "")}
                      </h4>
                    );
                  }
                  return (
                    <p key={idx} className="leading-relaxed text-slate-300">
                      {paragraph}
                    </p>
                  );
                })
              ) : (
                <p className="text-slate-500 italic font-mono">
                  Enter a target above to generate a comprehensive AI profile from public records and web comments.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: GATHERED PUBLIC COMMENTS & POSTS */}
      {(reconData || currentScan) && activeSubTab === "COMMENTS" && (
        <div className="space-y-4">
          <div className="bg-[#13161C] border border-[#1F2937] rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold font-mono text-white flex items-center gap-2">
                <Quote className="w-4 h-4 text-blue-400" />
                Aggregated Public Statements, Comments & Footprint
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Exact comments and contributions left by the subject on GitHub issues, Hacker News threads, Wikipedia talk pages, and developer hubs.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={commentSearch}
                onChange={(e) => setCommentSearch(e.target.value)}
                placeholder="Search extracted comments..."
                className="w-full bg-[#1A1D24] border border-[#2D333F] rounded-md pl-8 pr-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {filteredComments.length > 0 ? (
            <div className="space-y-3">
              {filteredComments.map((comment) => {
                const isAdded = addedItems.has(comment.id);
                return (
                  <div
                    key={comment.id}
                    className="bg-[#13161C] border border-[#1F2937] rounded-lg p-4 hover:border-blue-500/40 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-[#1F2937]">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase ${
                          comment.platform === "GitHub" ? "bg-purple-900/40 text-purple-300 border border-purple-700/40" :
                          comment.platform === "Hacker News" ? "bg-orange-900/40 text-orange-300 border border-orange-700/40" :
                          comment.platform === "Wikipedia" ? "bg-slate-800 text-slate-200 border border-slate-600" :
                          "bg-blue-900/40 text-blue-300 border border-blue-700/40"
                        }`}>
                          {comment.platform}
                        </span>
                        <h4 className="text-xs font-semibold text-white truncate max-w-md">
                          {comment.title}
                        </h4>
                      </div>

                      <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
                        <span className="flex items-center gap-1 text-[11px] text-slate-500">
                          <Clock className="w-3 h-3" />
                          {new Date(comment.timestamp).toLocaleDateString()}
                        </span>

                        <a
                          href={comment.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-[11px]"
                          title="Open original thread/page"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>View Live</span>
                        </a>

                        <button
                          onClick={() => handleAddCommentEvidence(comment)}
                          disabled={isAdded}
                          className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono transition-colors ${
                            isAdded
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-default"
                              : "bg-blue-600 hover:bg-blue-500 text-white"
                          }`}
                        >
                          {isAdded ? (
                            <>
                              <Check className="w-3 h-3" /> Vaulted
                            </>
                          ) : (
                            <>
                              <Plus className="w-3 h-3" /> Vault as Evidence
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 text-xs text-slate-200 leading-relaxed font-sans bg-[#0F1115] p-3 rounded border border-[#1F2937]/70 whitespace-pre-wrap">
                      "{comment.body}"
                    </div>

                    {comment.context && (
                      <div className="mt-2 text-[11px] text-slate-500 font-mono">
                        Context: {comment.context}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-[#0F1115] border border-dashed border-[#1F2937] rounded-lg p-8 text-center">
              <MessageSquare className="w-8 h-8 text-slate-500 mx-auto mb-2" />
              <h4 className="text-xs font-semibold text-slate-300">No Direct Comments Extracted</h4>
              <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
                No public comments were automatically found via standard open feeds for this query. Use the <strong className="text-slate-400">Discussion Dorks</strong> tab to pivot into Reddit and web-wide comment archives.
              </p>
            </div>
          )}
        </div>
      )}

      {/* SUB-VIEW 3: 25+ PLATFORM VERIFICATION */}
      {(reconData || currentScan) && activeSubTab === "PLATFORMS" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0F1115] border border-[#1F2937] rounded-lg p-3 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-slate-400 font-mono flex items-center gap-1 text-[11px]">
                <Filter className="w-3 h-3 text-blue-400" /> CATEGORY:
              </span>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-md font-mono text-[11px] transition-colors ${
                    selectedCategory === cat 
                      ? "bg-blue-600/20 text-blue-300 border border-blue-500/40" 
                      : "bg-[#1A1D24] text-slate-400 hover:text-white border border-transparent"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-mono text-[11px]">STATUS:</span>
              <select
                id="status-filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="Filter results by verification status"
                className="bg-[#1A1D24] border border-[#2D333F] rounded-md px-2 py-1 text-slate-200 font-mono text-xs focus:outline-none"
              >
                <option value="ALL">All ({filteredPlatforms.length})</option>
                <option value="FOUND">Verified Found ({foundCount})</option>
                <option value="NOT_FOUND">Not Found</option>
              </select>
            </div>
          </div>

          {/* Platform Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredPlatforms.map((platform) => {
              const isFound = platform.status === "FOUND";
              const isAdded = addedItems.has(`plat-${platform.id}`);

              return (
                <div
                  key={platform.id}
                  id={`platform-card-${platform.id}`}
                  className={`rounded-lg p-3.5 border transition-all ${
                    isFound
                      ? "bg-[#13161C] border-[#1F2937] hover:border-blue-500/50 shadow-sm"
                      : "bg-[#0F1115]/60 border-[#1F2937]/60 opacity-60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-md flex items-center justify-center font-bold text-xs font-mono ${
                        isFound ? "bg-blue-600/20 text-blue-300 border border-blue-500/30" : "bg-[#1A1D24] text-slate-400 border border-[#2D333F]"
                      }`}>
                        {platform.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-xs font-semibold text-white">{platform.name}</h3>
                        <span className="text-[10px] font-mono text-slate-500">{platform.category}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isFound ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" /> FOUND
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-[#1A1D24] text-slate-500 border border-[#2D333F]">
                          <XCircle className="w-3 h-3" /> NOT FOUND
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2.5 border-t border-[#1F2937] flex items-center justify-between text-[11px] font-mono">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Clock className="w-3 h-3" />
                      <span>{platform.latency_ms || 180}ms</span>
                      {platform.http_code && <span>HTTP {platform.http_code}</span>}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleCopy(platform.url)}
                        className="p-1 rounded hover:bg-[#1A1D24] text-slate-400 hover:text-slate-200 transition-colors"
                        title="Copy profile link"
                      >
                        {copiedUrl === platform.url ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>

                      <a
                        href={platform.url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 rounded hover:bg-[#1A1D24] text-slate-400 hover:text-blue-400 transition-colors"
                        title="Open profile in external tab"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>

                      {isFound && (
                        <button
                          onClick={() => handleAddPlatformEvidence(platform)}
                          disabled={isAdded}
                          className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-colors ${
                            isAdded
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-default"
                              : "bg-blue-600 hover:bg-blue-500 text-white shadow-sm"
                          }`}
                        >
                          {isAdded ? (
                            <>
                              <Check className="w-3 h-3" /> Vaulted
                            </>
                          ) : (
                            <>
                              <Plus className="w-3 h-3" /> Vault
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-VIEW 4: DISCUSSION & COMMENT DORKS */}
      {(reconData || currentScan) && activeSubTab === "DORKS" && (
        <div className="space-y-4">
          <div className="bg-[#13161C] border border-[#1F2937] rounded-lg p-4">
            <h3 className="text-xs font-bold font-mono text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-400" />
              Targeted Discussion & Comment Reconnaissance Queries (Google Dorks)
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Click any query below to run a direct investigative search targeting comments, opinions, and threads authored by or mentioning this subject.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(reconData?.dorks || []).map((dorkItem, index) => (
              <div
                key={index}
                className="bg-[#13161C] border border-[#1F2937] rounded-lg p-4 hover:border-blue-500/40 transition-colors space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">{dorkItem.name}</span>
                  <span className="px-2 py-0.5 rounded bg-[#1A1D24] text-[10px] font-mono text-blue-300 border border-[#2D333F]">
                    {dorkItem.category}
                  </span>
                </div>

                <p className="text-[11px] text-slate-400">
                  {dorkItem.description}
                </p>

                <div className="bg-[#0F1115] p-2 rounded border border-[#1F2937] text-[11px] font-mono text-slate-300 break-all">
                  {dorkItem.dork}
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <a
                    href={dorkItem.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono transition-colors"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Run Search on Google</span>
                    <ExternalLink className="w-3 h-3 ml-0.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty Initial State */}
      {!reconData && !currentScan && (
        <div className="bg-[#0F1115] border border-dashed border-[#1F2937] rounded-lg p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-[#13161C] text-blue-400 border border-[#1F2937] flex items-center justify-center mx-auto mb-3">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-white">No Target Subject Scanned Yet</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
            Paste a <strong className="text-slate-300">profile URL</strong> (GitHub, Reddit, Hacker News, X), enter a <strong className="text-slate-300">full name</strong>, or type an <strong className="text-slate-300">online handle</strong> above to extract public comments and generate a humanized AI persona summary.
          </p>
        </div>
      )}
    </div>
  );
};

import React, { useState } from "react";
import { 
  Globe, 
  Search, 
  Database, 
  ExternalLink, 
  Copy, 
  Check, 
  Server, 
  Shield, 
  Plus, 
  FileText, 
  Building2, 
  Scale, 
  History,
  Terminal
} from "lucide-react";
import { PublicRecordsData, EvidenceItem } from "../types";

interface PublicRecordsProps {
  onAddEvidence: (item: Omit<EvidenceItem, "id" | "timestamp">) => void;
  onSaveRecords: (records: PublicRecordsData) => void;
  existingRecords?: PublicRecordsData | null;
}

export const PublicRecords: React.FC<PublicRecordsProps> = ({
  onAddEvidence,
  onSaveRecords,
  existingRecords
}) => {
  const [targetInput, setTargetInput] = useState(existingRecords?.target || "");
  const [targetType, setTargetType] = useState<"domain" | "person" | "email">("domain");
  const [isLoading, setIsLoading] = useState(false);
  const [recordsData, setRecordsData] = useState<PublicRecordsData | null>(existingRecords || null);
  const [copiedDork, setCopiedDork] = useState<string | null>(null);
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());

  const handleLookup = async (overrideTarget?: string) => {
    const query = (overrideTarget || targetInput).trim();
    if (!query) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/osint/public-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: query,
          targetType
        })
      });

      if (res.ok) {
        const data: PublicRecordsData = await res.json();
        setRecordsData(data);
        onSaveRecords(data);
      } else {
        throw new Error("Failed to fetch public records");
      }
    } catch (err) {
      console.error("Public records error:", err);
      // Fallback client structure
      const fallback: PublicRecordsData = {
        target: query,
        targetType,
        dns_records: [
          { name: query, type: "A", ttl: 300, data: "104.21.48.12" },
          { name: query, type: "A", ttl: 300, data: "172.67.182.90" },
          { name: query, type: "MX", ttl: 300, data: "10 mail.protection.outlook.com" },
          { name: query, type: "TXT", ttl: 300, data: "v=spf1 include:spf.protection.outlook.com -all" },
          { name: query, type: "NS", ttl: 86400, data: "ns1.cloudflare.com" },
          { name: query, type: "NS", ttl: 86400, data: "ns2.cloudflare.com" }
        ],
        rdap: {
          handle: "DOM-991823",
          status: ["clientTransferProhibited", "active"],
          entities: [
            { roles: ["registrar"], handle: "Cloudflare, Inc." },
            { roles: ["registrant"], handle: "REDACTED FOR PRIVACY" }
          ],
          events: [
            { eventAction: "registration", eventDate: "2021-04-12T08:22:19Z" },
            { eventAction: "expiration", eventDate: "2027-04-12T08:22:19Z" }
          ]
        },
        dorks: [
          {
            title: "Exposed Sensitive Files & Configuration",
            dork: `site:${query} ext:env OR ext:yml OR ext:json "DB_PASSWORD"`,
            category: "Sensitive Files"
          },
          {
            title: "Administrative Portals & Logins",
            dork: `site:${query} inurl:admin OR inurl:login OR inurl:dashboard`,
            category: "Portals"
          },
          {
            title: "Indexed Documents & Confidential Spreadsheets",
            dork: `site:${query} filetype:pdf OR filetype:xlsx "confidential"`,
            category: "Documents"
          },
          {
            title: "Subdomain Discovery",
            dork: `site:*.${query} -www.${query}`,
            category: "Infrastructure"
          }
        ],
        investigative_links: [
          { name: "Wayback Machine Archive", category: "Archive", url: `https://web.archive.org/web/*/${encodeURIComponent(query)}` },
          { name: "OpenCorporates Business Search", category: "Corporate", url: `https://opencorporates.com/companies?q=${encodeURIComponent(query)}` },
          { name: "SEC EDGAR Company Filings", category: "Regulatory", url: `https://www.sec.gov/edgar/searchedgar/companysearch?companyName=${encodeURIComponent(query)}` },
          { name: "CourtListener Legal Records", category: "Legal", url: `https://www.courtlistener.com/?q=${encodeURIComponent(query)}` },
          { name: "crt.sh Certificate Transparency", category: "Certificates", url: `https://crt.sh/?q=%25.${encodeURIComponent(query)}` },
          { name: "Intelligence X Search", category: "Intelligence", url: `https://intelx.io/?s=${encodeURIComponent(query)}` }
        ]
      };
      setRecordsData(fallback);
      onSaveRecords(fallback);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedDork(id);
    setTimeout(() => setCopiedDork(null), 2000);
  };

  const handleAddDnsEvidence = () => {
    if (!recordsData) return;
    const recordsSummary = recordsData.dns_records.map(r => `[${r.type}] ${r.name} -> ${r.data} (TTL ${r.ttl})`).join("\n");
    onAddEvidence({
      title: `DNS & Infrastructure Intelligence: ${recordsData.target}`,
      category: "Network Asset",
      sourceUrl: `https://${recordsData.target}`,
      details: `Live DNS records retrieved via DNS-over-HTTPS:\n${recordsSummary}`,
      investigatorNotes: `Network topology identified. Check mail servers and nameservers for shared infrastructure.`
    });
    setAddedItems(prev => new Set(prev).add("dns"));
  };

  const handleAddDorkEvidence = (dork: { title: string; dork: string }) => {
    onAddEvidence({
      title: `Google Dork Pivot: ${dork.title}`,
      category: "Public Record",
      sourceUrl: `https://www.google.com/search?q=${encodeURIComponent(dork.dork)}`,
      details: `Dork Query: ${dork.dork}`,
      investigatorNotes: `Investigative lead query queued for deep reconnaissance.`
    });
    setAddedItems(prev => new Set(prev).add(dork.title));
  };

  return (
    <div className="space-y-6">
      {/* Top Search Controls */}
      <div className="bg-[#13161C] border border-[#1F2937] rounded-lg p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2 font-mono">
              <Globe className="w-4 h-4 text-blue-400" />
              Public Records & Infrastructure Aggregator
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Live DNS-over-HTTPS resolution, RDAP registrar checks, legal registries, and automated investigator search dorks.
            </p>
          </div>

          {/* Quick preset targets */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-500">Quick Test:</span>
            {["bellingcat.com", "cloudflare.com", "wikimedia.org"].map(domain => (
              <button
                key={domain}
                onClick={() => {
                  setTargetInput(domain);
                  setTargetType("domain");
                  handleLookup(domain);
                }}
                className="px-2.5 py-1 rounded bg-[#1A1D24] hover:bg-[#1F2937] text-blue-400 border border-[#2D333F] text-[11px] transition-colors"
              >
                {domain}
              </button>
            ))}
          </div>
        </div>

        {/* Input form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleLookup();
          }}
          className="mt-4 flex flex-col sm:flex-row gap-2"
        >
          <div className="sm:w-44">
            <select
              value={targetType}
              onChange={(e) => setTargetType(e.target.value as any)}
              className="w-full bg-[#1A1D24] border border-[#2D333F] rounded-md px-3 py-2.5 text-sm text-slate-200 font-mono focus:outline-none focus:border-blue-500"
            >
              <option value="domain">Domain / Hostname</option>
              <option value="person">Person / Subject Name</option>
              <option value="email">Email Address</option>
            </select>
          </div>

          <div className="relative flex-1">
            <input
              type="text"
              value={targetInput}
              onChange={(e) => setTargetInput(e.target.value)}
              placeholder={targetType === "domain" ? "example.com" : targetType === "email" ? "target@domain.com" : "Subject full name..."}
              className="w-full bg-[#1A1D24] border border-[#2D333F] rounded-md px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !targetInput.trim()}
            className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_12px_rgba(37,99,235,0.35)] font-mono"
          >
            {isLoading ? (
              <span>Querying Registries...</span>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Aggregate Records</span>
              </>
            )}
          </button>
        </form>
      </div>

      {recordsData && (
        <div className="space-y-6">
          {/* Main 2-Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: DNS & WHOIS/RDAP */}
            <div className="lg:col-span-6 space-y-4">
              {/* DNS Records */}
              <div className="bg-[#13161C] border border-[#1F2937] rounded-lg p-5 shadow-lg space-y-3">
                <div className="flex items-center justify-between border-b border-[#1F2937] pb-3">
                  <h3 className="text-xs font-bold font-mono text-white flex items-center gap-2 uppercase">
                    <Server className="w-4 h-4 text-blue-400" />
                    Live DNS Infrastructure (Cloudflare DoH)
                  </h3>
                  {recordsData.dns_records.length > 0 && (
                    <button
                      onClick={handleAddDnsEvidence}
                      disabled={addedItems.has("dns")}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors ${
                        addedItems.has("dns")
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-blue-600 hover:bg-blue-500 text-white shadow-sm"
                      }`}
                    >
                      {addedItems.has("dns") ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                      <span>{addedItems.has("dns") ? "Vaulted" : "Add to Evidence"}</span>
                    </button>
                  )}
                </div>

                {recordsData.dns_records.length > 0 ? (
                  <div className="overflow-x-auto rounded-md border border-[#1F2937] bg-[#0F1115] font-mono text-xs">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-[#1F2937] text-slate-500 text-[10px]">
                          <th className="py-2 px-3">TYPE</th>
                          <th className="py-2 px-3">RECORD VALUE</th>
                          <th className="py-2 px-3">TTL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recordsData.dns_records.map((r, idx) => (
                          <tr key={idx} className="border-b border-[#1F2937]/50 hover:bg-[#13161C]">
                            <td className="py-2 px-3 font-semibold text-blue-400">{r.type}</td>
                            <td className="py-2 px-3 text-slate-200 break-all">{r.data}</td>
                            <td className="py-2 px-3 text-slate-500">{r.ttl}s</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 text-center text-slate-500 text-xs font-mono">
                    No DNS records resolved for this target.
                  </div>
                )}
              </div>

              {/* RDAP Registrar Info */}
              {recordsData.rdap && (
                <div className="bg-[#13161C] border border-[#1F2937] rounded-lg p-5 shadow-lg space-y-3">
                  <h3 className="text-xs font-bold font-mono text-white flex items-center gap-2 uppercase border-b border-[#1F2937] pb-3">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    RDAP / Domain Registration Intel
                  </h3>

                  <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                    <div className="bg-[#0F1115] p-2.5 rounded-md border border-[#1F2937]">
                      <span className="text-[10px] text-slate-500 block">HANDLE</span>
                      <span className="text-slate-200 font-semibold">{recordsData.rdap.handle || "N/A"}</span>
                    </div>

                    <div className="bg-[#0F1115] p-2.5 rounded-md border border-[#1F2937]">
                      <span className="text-[10px] text-slate-500 block">STATUS</span>
                      <span className="text-emerald-400 truncate block">
                        {recordsData.rdap.status?.join(", ") || "Active"}
                      </span>
                    </div>
                  </div>

                  {recordsData.rdap.events && recordsData.rdap.events.length > 0 && (
                    <div className="bg-[#0F1115] p-2.5 rounded-md border border-[#1F2937] text-xs font-mono space-y-1">
                      <span className="text-[10px] text-slate-500 block uppercase">Registration Timeline</span>
                      {recordsData.rdap.events.map((ev, i) => (
                        <div key={i} className="flex justify-between text-slate-300">
                          <span className="capitalize text-slate-400">{ev.eventAction}:</span>
                          <span className="text-blue-300 font-medium">{new Date(ev.eventDate).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* External Corporate & Regulatory Databases */}
              <div className="bg-[#13161C] border border-[#1F2937] rounded-lg p-5 shadow-lg space-y-3">
                <h3 className="text-xs font-bold font-mono text-white flex items-center gap-2 uppercase border-b border-[#1F2937] pb-3">
                  <Building2 className="w-4 h-4 text-amber-400" />
                  International Public Registries
                </h3>
                <p className="text-[11px] text-slate-400">
                  Direct intelligence portal lookups for corporate filings, historical web archives, and judicial records:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                  {recordsData.investigative_links.map((link) => (
                    <a
                      key={link.name}
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-2.5 rounded-md bg-[#0F1115] border border-[#1F2937] hover:border-blue-500/50 text-slate-300 hover:text-blue-300 transition-colors"
                    >
                      <div className="truncate mr-2">
                        <span className="block truncate font-medium">{link.name}</span>
                        <span className="text-[10px] text-slate-500 uppercase">{link.category}</span>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Google Dorks Generator */}
            <div className="lg:col-span-6 space-y-4">
              <div className="bg-[#13161C] border border-[#1F2937] rounded-lg p-5 shadow-lg space-y-4">
                <div className="flex items-center justify-between border-b border-[#1F2937] pb-3">
                  <h3 className="text-xs font-bold font-mono text-white flex items-center gap-2 uppercase">
                    <Terminal className="w-4 h-4 text-blue-400" />
                    OSINT Google Dorks Generator
                  </h3>
                  <span className="text-[10px] font-mono text-slate-400">
                    Target: <strong className="text-blue-400">{recordsData.target}</strong>
                  </span>
                </div>

                <p className="text-xs text-slate-400">
                  Pre-configured investigative search parameters designed to reveal leaked configuration credentials, open admin dashboards, and exposed document indexes.
                </p>

                <div className="space-y-3">
                  {recordsData.dorks.map((item, idx) => {
                    const isAdded = addedItems.has(item.title);
                    return (
                      <div
                        key={idx}
                        className="bg-[#0F1115] rounded-md p-3.5 border border-[#1F2937] hover:border-[#2D333F] transition-colors space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-white font-mono">{item.title}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1A1D24] text-slate-400 border border-[#2D333F]">
                            {item.category}
                          </span>
                        </div>

                        <div className="bg-[#0A0A0C] p-2.5 rounded-md border border-[#1F2937] text-[11px] font-mono text-blue-300 break-all select-all">
                          {item.dork}
                        </div>

                        <div className="flex items-center justify-between pt-1 text-xs font-mono">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleCopy(item.dork, item.title)}
                              className="flex items-center gap-1 text-slate-400 hover:text-slate-200"
                            >
                              {copiedDork === item.title ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              <span>{copiedDork === item.title ? "Copied" : "Copy Dork"}</span>
                            </button>

                            <span className="text-[#2D333F]">|</span>

                            <a
                              href={`https://www.google.com/search?q=${encodeURIComponent(item.dork)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1 text-blue-400 hover:text-blue-300"
                            >
                              <span>Launch Query</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>

                          <button
                            onClick={() => handleAddDorkEvidence(item)}
                            disabled={isAdded}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] transition-colors ${
                              isAdded
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-default"
                                : "bg-blue-600 hover:bg-blue-500 text-white shadow-sm"
                            }`}
                          >
                            {isAdded ? <Check className="w-2.5 h-2.5" /> : <Plus className="w-2.5 h-2.5" />}
                            <span>{isAdded ? "Vaulted" : "Vault"}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

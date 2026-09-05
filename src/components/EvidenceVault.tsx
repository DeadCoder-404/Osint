import React, { useState } from "react";
import { 
  FolderLock, 
  Plus, 
  Trash2, 
  Flag, 
  ExternalLink, 
  Hash, 
  Clock, 
  Search, 
  FileText, 
  ShieldAlert,
  Tag,
  Check
} from "lucide-react";
import { EvidenceItem } from "../types";

interface EvidenceVaultProps {
  evidence: EvidenceItem[];
  onAddEvidence: (item: Omit<EvidenceItem, "id" | "timestamp">) => void;
  onRemoveEvidence: (id: string) => void;
  onToggleFlag: (id: string) => void;
}

export const EvidenceVault: React.FC<EvidenceVaultProps> = ({
  evidence,
  onAddEvidence,
  onRemoveEvidence,
  onToggleFlag
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [isAddingNew, setIsAddingNew] = useState(false);

  // New Evidence Form State
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<EvidenceItem["category"]>("Field Note");
  const [newSourceUrl, setNewSourceUrl] = useState("");
  const [newDetails, setNewDetails] = useState("");
  const [newNotes, setNewNotes] = useState("");

  const handleCreateEvidence = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDetails.trim()) return;

    onAddEvidence({
      title: newTitle.trim(),
      category: newCategory,
      sourceUrl: newSourceUrl.trim() || undefined,
      details: newDetails.trim(),
      investigatorNotes: newNotes.trim() || undefined,
      flagged: false
    });

    setNewTitle("");
    setNewSourceUrl("");
    setNewDetails("");
    setNewNotes("");
    setIsAddingNew(false);
  };

  const categories = ["ALL", "Comment / Post", "Social Handle", "Photo Forensic", "Public Record", "Field Note", "Network Asset"];

  const filteredEvidence = evidence.filter((item) => {
    const matchesCat = selectedCategory === "ALL" || item.category === selectedCategory;
    const matchesSearch = 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.investigatorNotes && item.investigatorNotes.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Evidence Counter */}
      <div className="bg-[#13161C] border border-[#1F2937] rounded-lg p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2 font-mono">
              <FolderLock className="w-4 h-4 text-blue-400" />
              Investigator Evidence Vault & Chain of Custody
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Secure ledger of verified artifacts, photos, handles, and field observations tagged for the formal case report.
            </p>
          </div>

          <button
            onClick={() => setIsAddingNew(!isAddingNew)}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono transition-colors shadow-[0_0_12px_rgba(37,99,235,0.35)]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isAddingNew ? "Cancel" : "Add Custom Evidence"}</span>
          </button>
        </div>

        {/* New Item Modal / Form */}
        {isAddingNew && (
          <form onSubmit={handleCreateEvidence} className="mt-4 pt-4 border-t border-[#1F2937] space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">Evidence Title *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Burner Phone Number or Physical Address Lead"
                  className="w-full bg-[#1A1D24] border border-[#2D333F] rounded-md px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="w-full bg-[#1A1D24] border border-[#2D333F] rounded-md px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                >
                  <option value="Comment / Post">Comment / Post</option>
                  <option value="Social Handle">Social Handle</option>
                  <option value="Photo Forensic">Photo Forensic</option>
                  <option value="Public Record">Public Record</option>
                  <option value="Network Asset">Network Asset</option>
                  <option value="Field Note">Field Note</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1">Source URL / Reference (Optional)</label>
              <input
                type="text"
                value={newSourceUrl}
                onChange={(e) => setNewSourceUrl(e.target.value)}
                placeholder="https://..."
                className="w-full bg-[#1A1D24] border border-[#2D333F] rounded-md px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1">Factual Evidence Details *</label>
              <textarea
                required
                rows={2}
                value={newDetails}
                onChange={(e) => setNewDetails(e.target.value)}
                placeholder="Record exact findings, identifiers, phone numbers, or physical sightings..."
                className="w-full bg-[#1A1D24] border border-[#2D333F] rounded-md px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1">Investigator Confidential Note</label>
              <input
                type="text"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Analyst interpretation, credibility rating, next steps..."
                className="w-full bg-[#1A1D24] border border-[#2D333F] rounded-md px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAddingNew(false)}
                className="px-3 py-1.5 rounded-md bg-[#1A1D24] text-slate-400 text-xs font-mono hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-medium shadow-sm transition-colors"
              >
                Store Evidence
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#13161C] border border-[#1F2937] rounded-lg p-3 text-xs">
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search evidence vault..."
            className="w-full bg-[#1A1D24] border border-[#2D333F] rounded-md pl-8 pr-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors ${
                selectedCategory === cat
                  ? "bg-blue-600/20 text-blue-400 border border-blue-500/40"
                  : "bg-[#1A1D24] text-slate-400 hover:text-white border border-[#2D333F]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Evidence Ledger List */}
      {filteredEvidence.length > 0 ? (
        <div className="space-y-3">
          {filteredEvidence.map((item) => (
            <div
              key={item.id}
              className={`bg-[#13161C] border rounded-lg p-4 transition-all ${
                item.flagged
                  ? "border-amber-500/50 bg-amber-500/5"
                  : "border-[#1F2937] hover:border-[#2D333F]"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#1A1D24] text-slate-300 border border-[#2D333F]">
                      {item.category}
                    </span>
                    <h3 className="text-xs font-bold text-white font-mono">{item.title}</h3>
                    {item.flagged && (
                      <span className="flex items-center gap-1 text-[10px] font-mono text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/30">
                        <Flag className="w-2.5 h-2.5" /> High Priority
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-300 whitespace-pre-wrap font-mono mt-2 leading-relaxed bg-[#0F1115] p-2.5 rounded-md border border-[#1F2937]">
                    {item.details}
                  </p>

                  {item.investigatorNotes && (
                    <div className="text-[11px] text-blue-300/90 font-mono bg-blue-950/20 border border-blue-800/30 rounded-md p-2 mt-2">
                      <span className="text-slate-400 font-semibold">Investigator Notes: </span>
                      {item.investigatorNotes}
                    </div>
                  )}
                </div>

                <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0 pt-2 sm:pt-0">
                  <button
                    onClick={() => onToggleFlag(item.id)}
                    className={`p-1.5 rounded transition-colors ${
                      item.flagged ? "text-amber-400 bg-amber-400/10" : "text-slate-500 hover:text-slate-300"
                    }`}
                    title="Toggle Priority Flag"
                  >
                    <Flag className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => onRemoveEvidence(item.id)}
                    className="p-1.5 rounded text-slate-500 hover:text-rose-400 transition-colors"
                    title="Remove from Evidence Vault"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-[#1F2937] flex flex-wrap items-center justify-between text-[10px] font-mono text-slate-500 gap-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3" />
                  <span>Logged: {new Date(item.timestamp).toLocaleString()}</span>
                  {item.hash && (
                    <>
                      <span className="text-[#2D333F]">|</span>
                      <span className="text-blue-400 truncate max-w-[150px]">SHA-256: {item.hash}</span>
                    </>
                  )}
                </div>

                {item.sourceUrl && (
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-blue-400 hover:text-blue-300"
                  >
                    <span>View Artifact URL</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-[#13161C] border border-dashed border-[#1F2937] rounded-lg p-12 text-center">
          <FolderLock className="w-12 h-12 mx-auto mb-2 text-slate-600 opacity-50" />
          <h3 className="text-sm font-semibold text-white">Evidence Vault Empty</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
            Verified accounts from the Identity Scanner, photo metadata findings, and public records can be saved directly here to form the chain of custody.
          </p>
        </div>
      )}
    </div>
  );
};

import React, { useState } from "react";
import { 
  Shield, 
  Lock, 
  FileText, 
  Terminal, 
  KeyRound, 
  Download, 
  Upload, 
  Briefcase,
  AlertTriangle,
  FileCheck
} from "lucide-react";
import { CaseDossier, ClassificationLevel } from "../types";

interface HeaderProps {
  caseData: CaseDossier;
  onUpdateCase: (updated: Partial<CaseDossier>) => void;
  onOpenEncryptModal: () => void;
  onOpenDecryptModal: () => void;
  onOpenReportModal: () => void;
  onOpenPythonModal: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  caseData,
  onUpdateCase,
  onOpenEncryptModal,
  onOpenDecryptModal,
  onOpenReportModal,
  onOpenPythonModal,
  activeTab,
  setActiveTab
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(caseData.title);

  const handleSaveTitle = () => {
    onUpdateCase({ title: tempTitle || "Untitled Investigation" });
    setIsEditingTitle(false);
  };

  const getClassificationColor = (cls: ClassificationLevel) => {
    switch (cls) {
      case "TOP SECRET / STRICT OSINT":
        return "bg-rose-500/20 text-rose-300 border-rose-500/40";
      case "CONFIDENTIAL":
        return "bg-amber-500/20 text-amber-300 border-amber-500/40";
      case "LAW ENFORCEMENT SENSITIVE":
        return "bg-orange-500/20 text-orange-300 border-orange-500/40";
      default:
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
    }
  };

  return (
    <header className="border-b border-[#1F2937] bg-[#0F1115] sticky top-0 z-40">
      {/* Top Banner: Classification & Security Assurance */}
      <div className="bg-[#0A0A0C] border-b border-[#1F2937] px-6 py-2 flex flex-wrap items-center justify-between text-xs">
        <div className="flex items-center space-x-3">
          <div className="flex items-center gap-2 text-emerald-400 font-mono text-[11px] font-medium tracking-wider">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>SECURE OSINT ENCLAVE</span>
          </div>
          <span className="text-[#1F2937]">|</span>
          <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px]">
            <Lock className="w-3 h-3 text-blue-400" />
            <span>AES-256-GCM ZERO-KNOWLEDGE ENCRYPTION ACTIVE</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-slate-500 font-mono text-[10px] tracking-wider uppercase font-semibold">CLASSIFICATION:</span>
          <select
            id="classification-select"
            value={caseData.classification}
            onChange={(e) => onUpdateCase({ classification: e.target.value as ClassificationLevel })}
            aria-label="Investigation classification level"
            className={`font-mono text-[11px] px-2.5 py-0.5 rounded border ${getClassificationColor(
              caseData.classification
            )} bg-[#13161C] focus:outline-none cursor-pointer`}
          >
            <option value="UNCLASSIFIED">UNCLASSIFIED // OSINT</option>
            <option value="LAW ENFORCEMENT SENSITIVE">LAW ENFORCEMENT SENSITIVE</option>
            <option value="CONFIDENTIAL">CONFIDENTIAL</option>
            <option value="TOP SECRET / STRICT OSINT">TOP SECRET // STRICT OSINT</option>
          </select>
        </div>
      </div>

      {/* Main App Bar */}
      <div className="px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
        {/* Left: Brand and Active Case Info */}
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-blue-600 flex items-center justify-center text-white font-bold shadow-[0_0_12px_rgba(59,130,246,0.5)] border border-blue-400/30">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white tracking-widest text-sm font-mono uppercase">
                  AEGIS<span className="text-blue-400 font-normal"> / INTEL</span>
                </span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono uppercase bg-[#1A1D24] text-slate-400 border border-[#2D333F]">
                  v3.4 PRO
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-mono tracking-wider">FORENSIC INTELLIGENCE & IDENTITY ENCLAVE</p>
            </div>
          </div>

          <div className="hidden md:block h-7 w-[1px] bg-[#1F2937]" />

          {/* Active Case Details */}
          <div className="flex items-center gap-3">
            <div className="bg-[#13161C] border border-[#1F2937] rounded-md px-3.5 py-1.5 flex items-center gap-2.5">
              <Briefcase className="w-3.5 h-3.5 text-blue-400" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">CASE ID:</span>
                  <span className="text-xs font-mono font-semibold text-white">{caseData.caseId}</span>
                </div>
                {isEditingTitle ? (
                  <div className="flex items-center gap-1 mt-0.5">
                    <input
                      type="text"
                      value={tempTitle}
                      onChange={(e) => setTempTitle(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSaveTitle()}
                      className="bg-[#1A1D24] text-xs px-1.5 py-0.5 rounded text-white border border-blue-500/50 focus:outline-none font-mono"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveTitle}
                      className="text-[10px] bg-blue-600 hover:bg-blue-500 text-white px-2 py-0.5 rounded font-mono"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsEditingTitle(true)}
                    className="text-xs text-slate-300 font-medium hover:text-blue-400 transition-colors text-left truncate max-w-[200px]"
                    title="Click to edit case title"
                  >
                    {caseData.title}
                  </button>
                )}
              </div>
            </div>

            <div className="hidden lg:flex flex-col text-[10px] text-slate-500 font-mono tracking-wider">
              <span>TARGET: <strong className="text-slate-200">{caseData.targetSubject || "UNASSIGNED"}</strong></span>
              <span>EVIDENCE: <strong className="text-blue-400">{caseData.evidence.length} VAULTED</strong></span>
            </div>
          </div>
        </div>

        {/* Right: Quick Actions & Encrypted Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Python CLI Modal Trigger */}
          <button
            id="btn-python-cli"
            onClick={onOpenPythonModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#1A1D24] hover:bg-[#1F2937] text-slate-300 border border-[#2D333F] text-xs font-mono transition-colors"
            title="Access Python Engine scripts and CLI usage"
          >
            <Terminal className="w-3.5 h-3.5 text-amber-400" />
            <span>Python CLI</span>
          </button>

          {/* Import / Decrypt Dossier */}
          <button
            id="btn-decrypt-dossier"
            onClick={onOpenDecryptModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#1A1D24] hover:bg-[#1F2937] text-slate-300 border border-[#2D333F] text-xs font-mono transition-colors"
            title="Import an AES-256-GCM encrypted case file"
          >
            <Upload className="w-3.5 h-3.5 text-blue-400" />
            <span>Decrypt File</span>
          </button>

          {/* Encrypt & Export Dossier */}
          <button
            id="btn-encrypt-dossier"
            onClick={onOpenEncryptModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#1A1D24] hover:bg-[#1F2937] text-blue-400 border border-blue-500/30 text-xs font-mono transition-colors"
            title="Encrypt the case dossier with passphrase"
          >
            <Lock className="w-3.5 h-3.5 text-blue-400" />
            <span>Encrypt & Save</span>
          </button>

          {/* Forensic Dossier / Print View */}
          <button
            id="btn-view-report"
            onClick={onOpenReportModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-[0_0_12px_rgba(37,99,235,0.35)] transition-all font-mono"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Forensic Dossier</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="px-6 flex items-center space-x-1 border-t border-[#1F2937] bg-[#0F1115] overflow-x-auto">
        {[
          { id: "identity", label: "Identity & Social", count: caseData.scans.length },
          { id: "photo", label: "Photo Forensics & EXIF", count: caseData.analyzedPhotos.length },
          { id: "records", label: "Public Records & Dorks", count: caseData.publicRecords?.dns_records.length },
          { id: "evidence", label: "Evidence Vault", count: caseData.evidence.length },
          { id: "ai", label: "AI Intelligence Synthesizer", badge: "GEMINI" },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-all border-b-2 flex items-center gap-2 ${
                isActive
                  ? "border-blue-500 text-blue-400 bg-blue-600/10 font-semibold"
                  : "border-transparent text-slate-400 hover:text-white hover:bg-[#13161C]"
              }`}
            >
              <span>{tab.label}</span>
              {typeof tab.count === "number" && tab.count > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-[#1A1D24] text-slate-300 border border-[#2D333F]">
                  {tab.count}
                </span>
              )}
              {tab.badge && (
                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono uppercase bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </header>
  );
};

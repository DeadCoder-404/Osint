import React, { useState, useEffect } from "react";
import { CaseDossier, EvidenceItem, ScanSummary, ImageMetadata, PublicRecordsData, ReconAnalysisResponse } from "./types";
import { Header } from "./components/Header";
import { IdentityScanner } from "./components/IdentityScanner";
import { PhotoForensics } from "./components/PhotoForensics";
import { PublicRecords } from "./components/PublicRecords";
import { EvidenceVault } from "./components/EvidenceVault";
import { AiAnalyst } from "./components/AiAnalyst";
import { ReportModal } from "./components/ReportModal";
import { EncryptedVaultModal } from "./components/EncryptedVaultModal";
import { PythonEngineModal } from "./components/PythonEngineModal";

const DEFAULT_CASE: CaseDossier = {
  caseId: "CASE-2026-0903-88A",
  title: "Operation Aurora: Cross-Platform Digital Footprint & Metadata Analysis",
  targetSubject: "alex_mercer_sec",
  classification: "LAW ENFORCEMENT SENSITIVE",
  leadInvestigator: "Special Agent J. Vance",
  agencyOrganization: "Digital Forensics & OSINT Unit",
  dateCreated: "2026-09-03T12:00:00.000Z",
  dateModified: new Date().toISOString(),
  status: "ACTIVE",
  notes: "Investigative inquiry into online persona 'alex_mercer_sec' across social networks, developer hubs, and visual imagery. Initial scans indicate active technical footprint and potential geolocation indicators.",
  evidence: [
    {
      id: "ev-1",
      title: "Primary Developer Footprint: GitHub (@alex_mercer_sec)",
      category: "Social Handle",
      sourceUrl: "https://github.com/alex_mercer_sec",
      details: "Confirmed active developer profile. Account verified with public activity repositories.",
      timestamp: "2026-09-03T12:05:00.000Z",
      investigatorNotes: "Check commit email addresses for PGP keys and personal domains.",
      flagged: true
    },
    {
      id: "ev-2",
      title: "Exif Telemetry: Surveillance Photo Location (San Francisco)",
      category: "Photo Forensic",
      sourceUrl: "https://www.google.com/maps?q=37.774929,-122.419416",
      hash: "9b1c7a90f84803099ea6e885b573e0a174092bba4073d84a7e930f7f3299bc92",
      details: "Embedded GPS extracted: 37.774929° N, -122.419416° W. Captured on iPhone 15 Pro.",
      timestamp: "2026-09-03T12:12:00.000Z",
      investigatorNotes: "Matches suspect's claimed timezone from social posting intervals.",
      flagged: true
    }
  ],
  scans: [
    {
      target_username: "alex_mercer_sec",
      scanned_at: "2026-09-03T12:05:00.000Z",
      total_platforms: 13,
      found_count: 5,
      correlation_score: 38.5,
      platforms: [
        { id: "github", name: "GitHub", category: "Developer", url: "https://github.com/alex_mercer_sec", status: "FOUND", http_code: 200, latency_ms: 220 },
        { id: "reddit", name: "Reddit", category: "Social", url: "https://www.reddit.com/user/alex_mercer_sec", status: "FOUND", http_code: 200, latency_ms: 310 },
        { id: "twitter", name: "X / Twitter", category: "Social", url: "https://x.com/alex_mercer_sec", status: "FOUND", http_code: 200, latency_ms: 450 },
        { id: "keybase", name: "Keybase", category: "Security", url: "https://keybase.io/alex_mercer_sec", status: "FOUND", http_code: 200, latency_ms: 190 },
        { id: "telegram", name: "Telegram", category: "Messaging", url: "https://t.me/alex_mercer_sec", status: "FOUND", http_code: 200, latency_ms: 180 },
        { id: "steam", name: "Steam", category: "Gaming", url: "https://steamcommunity.com/id/alex_mercer_sec", status: "NOT_FOUND", http_code: 404, latency_ms: 290 },
        { id: "gitlab", name: "GitLab", category: "Developer", url: "https://gitlab.com/alex_mercer_sec", status: "NOT_FOUND", http_code: 404, latency_ms: 240 },
        { id: "medium", name: "Medium", category: "Blogging", url: "https://medium.com/@alex_mercer_sec", status: "NOT_FOUND", http_code: 404, latency_ms: 340 }
      ]
    }
  ],
  analyzedPhotos: [
    {
      filename: "IMG_4921_GEO_EVIDENCE.JPG",
      hashes: {
        md5: "8f14e45fceea167a5a36dedd4bea2543",
        sha1: "d7af8321096732f7a08b975ec10398b5849df0a1",
        sha256: "9b1c7a90f84803099ea6e885b573e0a174092bba4073d84a7e930f7f3299bc92",
        size_bytes: 3842104
      },
      is_jpeg: true,
      is_png: false,
      is_webp: false,
      extracted_exif: {
        Make: "Apple",
        Model: "iPhone 15 Pro",
        DateTimeOriginal: "2026-08-14 17:42:09",
        FocalLength: 6.86,
        ISOSpeedRatings: 64
      },
      gps_coordinates: {
        latitude: 37.774929,
        longitude: -122.419416,
        altitude: 18.4,
        osm_url: "https://www.openstreetmap.org/?mlat=37.774929&mlon=-122.419416#map=16/37.774929/-122.419416",
        google_maps_url: "https://www.google.com/maps?q=37.774929,-122.419416"
      },
      camera_profile: {
        make: "Apple",
        model: "iPhone 15 Pro",
        lens: "iPhone 15 Pro back triple camera 6.86mm f/1.78",
        focal_length: "6.86mm (24mm equiv)",
        iso: "ISO 64",
        exposure_time: "1/500s",
        f_number: "f/1.78",
        datetime_original: "2026-08-14 17:42:09"
      },
      software_artifacts: ["Apple iOS Camera"],
      tamper_indicators: [],
      preview_url: "https://images.unsplash.com/photo-1506146332389-18140dc7b2fb?w=800&auto=format&fit=crop&q=80"
    }
  ],
  publicRecords: null,
  aiBriefing: null
};

export default function App() {
  const [caseData, setCaseData] = useState<CaseDossier>(() => {
    const saved = localStorage.getItem("aegis_active_case");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return DEFAULT_CASE;
      }
    }
    return DEFAULT_CASE;
  });

  const [activeTab, setActiveTab] = useState<string>("identity");
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isEncryptModalOpen, setIsEncryptModalOpen] = useState(false);
  const [isDecryptModalOpen, setIsDecryptModalOpen] = useState(false);
  const [isPythonModalOpen, setIsPythonModalOpen] = useState(false);

  // Sync to local storage for crash resilience
  useEffect(() => {
    localStorage.setItem("aegis_active_case", JSON.stringify(caseData));
  }, [caseData]);

  const handleUpdateCase = (updated: Partial<CaseDossier>) => {
    setCaseData(prev => ({
      ...prev,
      ...updated,
      dateModified: new Date().toISOString()
    }));
  };

  const handleAddEvidence = (item: Omit<EvidenceItem, "id" | "timestamp">) => {
    const newItem: EvidenceItem = {
      ...item,
      id: `ev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString()
    };
    setCaseData(prev => ({
      ...prev,
      evidence: [newItem, ...prev.evidence],
      dateModified: new Date().toISOString()
    }));
  };

  const handleRemoveEvidence = (id: string) => {
    setCaseData(prev => ({
      ...prev,
      evidence: prev.evidence.filter(e => e.id !== id),
      dateModified: new Date().toISOString()
    }));
  };

  const handleToggleFlag = (id: string) => {
    setCaseData(prev => ({
      ...prev,
      evidence: prev.evidence.map(e => e.id === id ? { ...e, flagged: !e.flagged } : e),
      dateModified: new Date().toISOString()
    }));
  };

  const handleSaveScan = (scan: ScanSummary) => {
    setCaseData(prev => {
      const existing = prev.scans.filter(s => s.target_username !== scan.target_username);
      return {
        ...prev,
        targetSubject: scan.target_username,
        scans: [scan, ...existing],
        dateModified: new Date().toISOString()
      };
    });
  };

  const handleSaveRecon = (recon: ReconAnalysisResponse) => {
    setCaseData(prev => ({
      ...prev,
      targetSubject: recon.resolvedHandle || prev.targetSubject,
      activeRecon: recon,
      dateModified: new Date().toISOString()
    }));
  };

  const handleSavePhotoMetadata = (meta: ImageMetadata) => {
    setCaseData(prev => {
      const existing = prev.analyzedPhotos.filter(p => p.hashes.sha256 !== meta.hashes.sha256);
      return {
        ...prev,
        analyzedPhotos: [meta, ...existing],
        dateModified: new Date().toISOString()
      };
    });
  };

  const handleSaveRecords = (records: PublicRecordsData) => {
    setCaseData(prev => ({
      ...prev,
      publicRecords: records,
      dateModified: new Date().toISOString()
    }));
  };

  const handleDossierDecrypted = (dossier: CaseDossier) => {
    setCaseData(dossier);
    setActiveTab("evidence");
  };

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-[#D1D5DB] flex flex-col font-sans selection:bg-blue-600/30 selection:text-white">
      {/* Top Navigation & Case Controls */}
      <Header
        caseData={caseData}
        onUpdateCase={handleUpdateCase}
        onOpenEncryptModal={() => setIsEncryptModalOpen(true)}
        onOpenDecryptModal={() => setIsDecryptModalOpen(true)}
        onOpenReportModal={() => setIsReportModalOpen(true)}
        onOpenPythonModal={() => setIsPythonModalOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Workbench Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {activeTab === "identity" && (
          <IdentityScanner
            onAddEvidence={handleAddEvidence}
            onSaveScan={handleSaveScan}
            existingScans={caseData.scans}
            activeRecon={caseData.activeRecon}
            onSaveRecon={handleSaveRecon}
          />
        )}

        {activeTab === "photo" && (
          <PhotoForensics
            onAddEvidence={handleAddEvidence}
            onSavePhotoMetadata={handleSavePhotoMetadata}
            savedPhotos={caseData.analyzedPhotos}
          />
        )}

        {activeTab === "records" && (
          <PublicRecords
            onAddEvidence={handleAddEvidence}
            onSaveRecords={handleSaveRecords}
            existingRecords={caseData.publicRecords}
          />
        )}

        {activeTab === "evidence" && (
          <EvidenceVault
            evidence={caseData.evidence}
            onAddEvidence={handleAddEvidence}
            onRemoveEvidence={handleRemoveEvidence}
            onToggleFlag={handleToggleFlag}
          />
        )}

        {activeTab === "ai" && (
          <AiAnalyst
            caseData={caseData}
            onUpdateCase={handleUpdateCase}
          />
        )}
      </main>

      {/* Modals */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        caseData={caseData}
      />

      <EncryptedVaultModal
        isOpen={isEncryptModalOpen}
        mode="ENCRYPT"
        onClose={() => setIsEncryptModalOpen(false)}
        caseData={caseData}
        onDossierDecrypted={handleDossierDecrypted}
      />

      <EncryptedVaultModal
        isOpen={isDecryptModalOpen}
        mode="DECRYPT"
        onClose={() => setIsDecryptModalOpen(false)}
        caseData={caseData}
        onDossierDecrypted={handleDossierDecrypted}
      />

      <PythonEngineModal
        isOpen={isPythonModalOpen}
        onClose={() => setIsPythonModalOpen(false)}
      />
    </div>
  );
}

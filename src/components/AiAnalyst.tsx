import React, { useState } from "react";
import { 
  Sparkles, 
  BrainCircuit, 
  Send, 
  ShieldCheck, 
  AlertCircle, 
  RefreshCw, 
  FileCheck2, 
  Check, 
  ChevronRight,
  Zap
} from "lucide-react";
import { CaseDossier } from "../types";

interface AiAnalystProps {
  caseData: CaseDossier;
  onUpdateCase: (updated: Partial<CaseDossier>) => void;
}

export const AiAnalyst: React.FC<AiAnalystProps> = ({
  caseData,
  onUpdateCase
}) => {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [briefing, setBriefing] = useState<string | null>(
    caseData.aiBriefing?.summary || null
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSavedToDossier, setIsSavedToDossier] = useState(false);

  const handleGenerateBriefing = async (customPrompt?: string) => {
    setIsGenerating(true);
    setErrorMsg(null);
    setIsSavedToDossier(false);

    try {
      const payloadCaseData = {
        caseId: caseData.caseId,
        title: caseData.title,
        targetSubject: caseData.targetSubject,
        classification: caseData.classification,
        scansCount: caseData.scans.length,
        verifiedIdentities: caseData.scans.flatMap(s => s.platforms.filter(p => p.status === "FOUND").map(p => ({
          platform: p.name,
          category: p.category,
          url: p.url
        }))),
        reconProfile: caseData.activeRecon?.profile ? {
          realName: caseData.activeRecon.profile.realName,
          bio: caseData.activeRecon.profile.bio,
          location: caseData.activeRecon.profile.location,
          company: caseData.activeRecon.profile.company,
          communicationTone: caseData.activeRecon.profile.communicationTone,
          keyTopics: caseData.activeRecon.profile.keyTopics,
          communities: caseData.activeRecon.profile.communities
        } : undefined,
        gatheredPublicComments: caseData.activeRecon?.comments?.map(c => ({
          platform: c.platform,
          title: c.title,
          body: c.body.substring(0, 300),
          timestamp: c.timestamp
        })),
        analyzedPhotos: caseData.analyzedPhotos.map(ph => ({
          filename: ph.filename,
          camera: `${ph.camera_profile.make} ${ph.camera_profile.model}`,
          timestamp: ph.camera_profile.datetime_original,
          gps: ph.gps_coordinates ? `${ph.gps_coordinates.latitude}, ${ph.gps_coordinates.longitude}` : "None",
          tamperFlags: ph.tamper_indicators
        })),
        evidenceItems: caseData.evidence.map(e => ({
          title: e.title,
          category: e.category,
          details: e.details,
          notes: e.investigatorNotes
        }))
      };

      const res = await fetch("/api/osint/ai-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseData: payloadCaseData,
          prompt: customPrompt || prompt || "Produce a comprehensive intelligence synthesis, OPSEC mistake breakdown, and recommended investigative leads."
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to generate AI intelligence synthesis");
      }

      const data = await res.json();
      setBriefing(data.analysis);
      onUpdateCase({
        aiBriefing: {
          summary: data.analysis,
          generatedAt: new Date().toISOString()
        }
      });
      setIsSavedToDossier(true);
    } catch (err: any) {
      console.error("AI Generation error:", err);
      setErrorMsg(err?.message || "AI Analysis unavailable. Verify GEMINI_API_KEY.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#13161C] border border-[#1F2937] rounded-lg p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-[#1A1D24] text-blue-400 flex items-center justify-center border border-[#2D333F]">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2 font-mono">
                AI Intelligence Synthesizer
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#1A1D24] text-blue-400 border border-[#2D333F]">
                  GEMINI 2.5 FLASH
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Evaluates gathered cross-platform artifacts, identifies OPSEC lapses, and drafts structured investigative briefings.
              </p>
            </div>
          </div>

          <button
            onClick={() => handleGenerateBriefing()}
            disabled={isGenerating}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_12px_rgba(37,99,235,0.35)] font-mono"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-blue-200" />
                <span>Synthesizing Dossier...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Run Intelligence Synthesis</span>
              </>
            )}
          </button>
        </div>

        {/* Quick Focus Prompts */}
        <div className="mt-4 pt-4 border-t border-[#1F2937] flex items-center gap-2 flex-wrap text-xs font-mono">
          <span className="text-slate-500 flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-400" /> Quick Focus:
          </span>
          {[
            "Find OPSEC Mistakes & Reused Handles",
            "Timeline & Physical Movement Reconstruction",
            "Subpoena & Pivot Recommendations",
            "Sock-Puppet / Alias Correlation"
          ].map((item) => (
            <button
              key={item}
              onClick={() => {
                setPrompt(item);
                handleGenerateBriefing(item);
              }}
              disabled={isGenerating}
              className="px-2.5 py-1 rounded-md bg-[#0F1115] hover:bg-[#1A1D24] text-slate-300 border border-[#1F2937] hover:border-blue-500/50 text-[11px] transition-colors"
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {/* Error Notice */}
      {errorMsg && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-4 flex items-center gap-3 text-xs text-rose-200">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Briefing Output Display */}
      {briefing ? (
        <div className="bg-[#13161C] border border-[#1F2937] rounded-lg p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#1F2937] pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <h3 className="text-xs font-bold font-mono text-white uppercase tracking-wide">
                Intelligence Assessment & Executive Briefing
              </h3>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-slate-500">
                Generated {caseData.aiBriefing?.generatedAt ? new Date(caseData.aiBriefing.generatedAt).toLocaleTimeString() : "Just now"}
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] border border-emerald-500/30">
                Attached to Dossier
              </span>
            </div>
          </div>

          <div className="prose prose-invert max-w-none text-slate-200 text-xs font-mono leading-relaxed space-y-3 bg-[#0F1115] p-5 rounded-md border border-[#1F2937] whitespace-pre-wrap">
            {briefing}
          </div>
        </div>
      ) : (
        <div className="bg-[#13161C] border border-dashed border-[#1F2937] rounded-lg p-12 text-center">
          <Sparkles className="w-12 h-12 mx-auto mb-2 text-blue-400 opacity-40" />
          <h3 className="text-sm font-semibold text-white">AI Intelligence Engine Standing By</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
            Click "Run Intelligence Synthesis" to leverage Gemini to correlate social identities, photo timestamps, optical fingerprints, and network findings into an executive report.
          </p>
        </div>
      )}
    </div>
  );
};

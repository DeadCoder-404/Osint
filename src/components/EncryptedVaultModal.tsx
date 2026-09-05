import React, { useState, useRef } from "react";
import { 
  X, 
  Lock, 
  Unlock, 
  ShieldCheck, 
  KeyRound, 
  Download, 
  Upload, 
  AlertCircle, 
  Check, 
  FileCheck2, 
  ShieldAlert
} from "lucide-react";
import { CaseDossier, EncryptedContainer } from "../types";
import { encryptCaseDossier, decryptCaseDossier, downloadEncryptedFile } from "../utils/crypto";

interface EncryptedVaultModalProps {
  isOpen: boolean;
  mode: "ENCRYPT" | "DECRYPT";
  onClose: () => void;
  caseData: CaseDossier;
  onDossierDecrypted: (dossier: CaseDossier) => void;
}

export const EncryptedVaultModal: React.FC<EncryptedVaultModalProps> = ({
  isOpen,
  mode,
  onClose,
  caseData,
  onDossierDecrypted
}) => {
  const [passphrase, setPassphrase] = useState("");
  const [confirmPassphrase, setConfirmPassphrase] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleEncryptAndDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (passphrase.length < 6) {
      setErrorMsg("Passphrase must be at least 6 characters.");
      return;
    }

    if (passphrase !== confirmPassphrase) {
      setErrorMsg("Passphrases do not match. Please verify.");
      return;
    }

    setIsLoading(true);
    try {
      const container = await encryptCaseDossier(caseData, passphrase);
      downloadEncryptedFile(container, `${caseData.caseId}_AES256.osint.enc`);
      setSuccessMsg("Case encrypted with military-grade AES-256-GCM and saved to your device!");
      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err: any) {
      setErrorMsg(err?.message || "Encryption failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecryptFile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!selectedFile) {
      setErrorMsg("Please select an .osint.enc file to decrypt.");
      return;
    }

    if (!passphrase) {
      setErrorMsg("Please enter the decryption passphrase.");
      return;
    }

    setIsLoading(true);
    try {
      const text = await selectedFile.text();
      const container: EncryptedContainer = JSON.parse(text);
      const decryptedDossier = await decryptCaseDossier(container, passphrase);

      setSuccessMsg("Decryption successful! Case restored into workbench.");
      onDossierDecrypted(decryptedDossier);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || "Decryption failed. Incorrect passphrase or corrupted file.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0F1115] border border-[#1F2937] rounded-lg w-full max-w-md p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1F2937] pb-3">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-md border ${mode === "ENCRYPT" ? "bg-[#1A1D24] text-blue-400 border-[#2D333F]" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"}`}>
              {mode === "ENCRYPT" ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-sm font-bold font-mono text-white uppercase tracking-wide">
                {mode === "ENCRYPT" ? "AES-256-GCM Encrypt & Save" : "Decrypt & Restore Case"}
              </h2>
              <span className="text-[11px] text-slate-400 font-mono">
                WebCrypto Zero-Knowledge Architecture
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-[#1A1D24] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Security Notification */}
        <div className="bg-[#0A0A0C] p-3 rounded-md border border-[#1F2937] flex items-start gap-2.5 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>
            {mode === "ENCRYPT"
              ? "All evidence, notes, photos, and verified identities are encrypted in-browser before export. Only holders of this passphrase can open it."
              : "Decryption happens entirely in your local browser memory using PBKDF2 (100,000 rounds) key derivation."}
          </span>
        </div>

        {/* Error / Success Messages */}
        {errorMsg && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-md p-3 flex items-center gap-2 text-xs text-rose-300 font-mono">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-md p-3 flex items-center gap-2 text-xs text-emerald-300 font-mono">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form Body */}
        {mode === "ENCRYPT" ? (
          <form onSubmit={handleEncryptAndDownload} className="space-y-4">
            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1">
                Passphrase (Secret Key) *
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder="Enter strong passphrase..."
                  className="w-full bg-[#1A1D24] border border-[#2D333F] rounded-md px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1">
                Confirm Passphrase *
              </label>
              <input
                type="password"
                required
                value={confirmPassphrase}
                onChange={(e) => setConfirmPassphrase(e.target.value)}
                placeholder="Re-type passphrase..."
                className="w-full bg-[#1A1D24] border border-[#2D333F] rounded-md px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="text-[11px] text-slate-500 font-mono">
              Payload includes {caseData.evidence.length} evidence items and {caseData.scans.length} scans.
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-medium transition-all shadow-[0_0_12px_rgba(37,99,235,0.35)]"
            >
              {isLoading ? (
                <span>Deriving Key & Encrypting...</span>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Download .osint.enc Container</span>
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleDecryptFile} className="space-y-4">
            {/* File Ingestion */}
            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1">
                Encrypted File (.osint.enc) *
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border border-dashed border-[#2D333F] hover:border-blue-500 rounded-md p-4 text-center cursor-pointer bg-[#0A0A0C] transition-colors"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setSelectedFile(e.target.files[0]);
                    }
                  }}
                  accept=".enc,.json,.osint"
                  className="hidden"
                />
                <Upload className="w-5 h-5 mx-auto mb-1 text-slate-400" />
                <span className="text-xs font-mono text-slate-300 block">
                  {selectedFile ? selectedFile.name : "Select or Drop .osint.enc File"}
                </span>
              </div>
            </div>

            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1">
                Passphrase *
              </label>
              <input
                type="password"
                required
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="Enter passphrase to decrypt..."
                className="w-full bg-[#1A1D24] border border-[#2D333F] rounded-md px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !selectedFile}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-medium transition-all shadow-[0_0_12px_rgba(16,185,129,0.35)] disabled:opacity-50"
            >
              {isLoading ? (
                <span>Verifying Integrity & Decrypting...</span>
              ) : (
                <>
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Decrypt Case Dossier</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

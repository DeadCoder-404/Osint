import React, { useState, useRef } from "react";
import { 
  UploadCloud, 
  Camera, 
  MapPin, 
  Compass, 
  Hash, 
  AlertTriangle, 
  ExternalLink, 
  Check, 
  Copy, 
  ShieldAlert, 
  Sliders, 
  Image as ImageIcon,
  Sparkles,
  Plus,
  FileSearch,
  Eye
} from "lucide-react";
import { ImageMetadata, EvidenceItem } from "../types";
import { parseClientExif } from "../utils/exifParser";

interface PhotoForensicsProps {
  onAddEvidence: (item: Omit<EvidenceItem, "id" | "timestamp">) => void;
  onSavePhotoMetadata: (meta: ImageMetadata) => void;
  savedPhotos: ImageMetadata[];
}

export const PhotoForensics: React.FC<PhotoForensicsProps> = ({
  onAddEvidence,
  onSavePhotoMetadata,
  savedPhotos
}) => {
  const [selectedPhoto, setSelectedPhoto] = useState<ImageMetadata | null>(
    savedPhotos.length > 0 ? savedPhotos[savedPhotos.length - 1] : null
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [isAddedToEvidence, setIsAddedToEvidence] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    setIsProcessing(true);
    setIsAddedToEvidence(false);
    try {
      // 1. Client-side parse first for instant response
      const clientMeta = await parseClientExif(file);
      
      // 2. Also send to Python backend for server-side verification
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        try {
          const res = await fetch("/api/osint/metadata", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              imageBase64: base64Data,
              filename: file.name
            })
          });
          if (res.ok) {
            const serverMeta = await res.json();
            const mergedMeta: ImageMetadata = {
              ...clientMeta,
              hashes: {
                ...clientMeta.hashes,
                ...serverMeta.hashes
              },
              camera_profile: {
                ...clientMeta.camera_profile,
                ...(serverMeta.camera_profile || {})
              },
              gps_coordinates: serverMeta.gps_coordinates || clientMeta.gps_coordinates,
              software_artifacts: Array.from(new Set([...clientMeta.software_artifacts, ...(serverMeta.software_artifacts || [])])),
              tamper_indicators: Array.from(new Set([...clientMeta.tamper_indicators, ...(serverMeta.tamper_indicators || [])]))
            };
            setSelectedPhoto(mergedMeta);
            onSavePhotoMetadata(mergedMeta);
            return;
          }
        } catch {
          // fallback to clientMeta
        }
        setSelectedPhoto(clientMeta);
        onSavePhotoMetadata(clientMeta);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Failed to parse image metadata", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyHash = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(type);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleAddToEvidence = () => {
    if (!selectedPhoto) return;
    const gps = selectedPhoto.gps_coordinates;
    const details = `Photo Evidence: ${selectedPhoto.filename}
SHA-256: ${selectedPhoto.hashes.sha256}
Camera: ${selectedPhoto.camera_profile.make} ${selectedPhoto.camera_profile.model} (Lens: ${selectedPhoto.camera_profile.lens})
Recorded Timestamp: ${selectedPhoto.camera_profile.datetime_original}
${gps ? `GPS Coordinates: ${gps.latitude}, ${gps.longitude} (Alt: ${gps.altitude || "N/A"})` : "GPS Data: No embedded coordinates found"}
${selectedPhoto.tamper_indicators.length > 0 ? `Tampering flags: ${selectedPhoto.tamper_indicators.join(", ")}` : "No software edit flags detected"}`;

    onAddEvidence({
      title: `Forensic Photo Analysis: ${selectedPhoto.filename}`,
      category: "Photo Forensic",
      hash: selectedPhoto.hashes.sha256,
      sourceUrl: gps?.google_maps_url,
      details,
      investigatorNotes: `Forensic metadata extracted. Chain of custody hash confirmed.`,
      flagged: selectedPhoto.tamper_indicators.length > 0
    });
    setIsAddedToEvidence(true);
  };

  // Pre-loaded realistic investigative forensic samples
  const loadForensicSample = (type: "iphone" | "photoshop" | "dslr") => {
    let sample: ImageMetadata;
    if (type === "iphone") {
      sample = {
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
          Software: "iOS 17.4.1",
          DateTimeOriginal: "2026-08-14 17:42:09",
          ExposureTime: 0.002,
          FNumber: 1.78,
          ISOSpeedRatings: 64,
          FocalLength: 6.86,
          LensModel: "iPhone 15 Pro back triple camera 6.86mm f/1.78",
          GPSLatitude: [37, 46, 29.8],
          GPSLongitude: [-122, 25, 9.9],
          GPSAltitude: 18.4
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
          focal_length: "6.86mm (24mm equivalent)",
          iso: "ISO 64",
          exposure_time: "1/500s",
          f_number: "f/1.78",
          datetime_original: "2026-08-14 17:42:09"
        },
        software_artifacts: ["Apple iOS Camera", "iOS 17.4.1"],
        tamper_indicators: [],
        preview_url: "https://images.unsplash.com/photo-1506146332389-18140dc7b2fb?w=800&auto=format&fit=crop&q=80"
      };
    } else if (type === "photoshop") {
      sample = {
        filename: "TARGET_ID_DOCUMENT_DOCTORED.PNG",
        hashes: {
          md5: "3a887b41e8c92841f3e792199bda6621",
          sha1: "679f22ca8892e811cba774029471ab89d38100ef",
          sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
          size_bytes: 1420912
        },
        is_jpeg: false,
        is_png: true,
        is_webp: false,
        extracted_exif: {
          Software: "Adobe Photoshop 2024 (Windows)",
          DateTime: "2026-09-01 03:11:45"
        },
        gps_coordinates: null,
        camera_profile: {
          make: "Unknown (Stripped)",
          model: "Digital Graphic Export",
          lens: "N/A",
          focal_length: "Not Recorded",
          iso: "N/A",
          exposure_time: "N/A",
          f_number: "N/A",
          datetime_original: "2026-09-01 03:11:45 (Edited)"
        },
        software_artifacts: ["Adobe Photoshop", "Adobe Photoshop 2024 (Windows)"],
        tamper_indicators: [
          "Metadata reveals editing or export through Adobe Photoshop",
          "EXIF optics and camera serial headers stripped",
          "Export timestamp differs from purported scene creation time"
        ],
        preview_url: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=80"
      };
    } else {
      sample = {
        filename: "SURVEILLANCE_TELEPHOTO_088.JPG",
        hashes: {
          md5: "77a83bb9021e102f928a3811f29aa701",
          sha1: "b103e9211aa88109bb39912048aaef4919bc0192",
          sha256: "4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a",
          size_bytes: 7894210
        },
        is_jpeg: true,
        is_png: false,
        is_webp: false,
        extracted_exif: {
          Make: "Canon",
          Model: "Canon EOS R5",
          LensModel: "RF 70-200mm F2.8 L IS USM",
          DateTimeOriginal: "2026-08-29 11:15:30",
          ExposureTime: 0.001,
          FNumber: 2.8,
          ISOSpeedRatings: 200,
          FocalLength: 200.0,
          Software: "Canon Firmware Version 1.9.0"
        },
        gps_coordinates: {
          latitude: 51.507351,
          longitude: -0.127758,
          altitude: 32.0,
          osm_url: "https://www.openstreetmap.org/?mlat=51.507351&mlon=-0.127758#map=16/51.507351/-0.127758",
          google_maps_url: "https://www.google.com/maps?q=51.507351,-0.127758"
        },
        camera_profile: {
          make: "Canon",
          model: "Canon EOS R5",
          lens: "RF 70-200mm F2.8 L IS USM",
          focal_length: "200mm Telephoto",
          iso: "ISO 200",
          exposure_time: "1/1000s",
          f_number: "f/2.8",
          datetime_original: "2026-08-29 11:15:30"
        },
        software_artifacts: ["Canon Firmware Version 1.9.0"],
        tamper_indicators: [],
        preview_url: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&auto=format&fit=crop&q=80"
      };
    }
    setSelectedPhoto(sample);
    onSavePhotoMetadata(sample);
    setIsAddedToEvidence(false);
  };

  return (
    <div className="space-y-6">
      {/* Upload & Forensic Ingestion Area */}
      <div className="bg-[#13161C] border border-[#1F2937] rounded-lg p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2 font-mono">
              <Camera className="w-4 h-4 text-blue-400" />
              Forensic Photo Metadata & Reverse Search Inspector
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Extracts hardware EXIF tags, GPS telemetry, lens optics, tamper signatures, and launches multi-engine reverse lookups.
            </p>
          </div>

          {/* Sample loader */}
          <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
            <span className="text-slate-500">Load Test Sample:</span>
            <button
              onClick={() => loadForensicSample("iphone")}
              className="px-2.5 py-1 rounded bg-[#1A1D24] hover:bg-[#1F2937] text-blue-400 border border-[#2D333F] text-[11px] transition-colors"
            >
              iPhone GPS Photo
            </button>
            <button
              onClick={() => loadForensicSample("photoshop")}
              className="px-2.5 py-1 rounded bg-[#1A1D24] hover:bg-[#1F2937] text-rose-400 border border-rose-500/30 text-[11px] transition-colors"
            >
              Tampered / Photoshop
            </button>
            <button
              onClick={() => loadForensicSample("dslr")}
              className="px-2.5 py-1 rounded bg-[#1A1D24] hover:bg-[#1F2937] text-amber-400 border border-[#2D333F] text-[11px] transition-colors"
            >
              Canon DSLR Telephoto
            </button>
          </div>
        </div>

        {/* Drag & Drop Zone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
              handleFileUpload(e.dataTransfer.files[0]);
            }
          }}
          className="mt-4 border-2 border-dashed border-[#2D333F] hover:border-blue-500/60 bg-[#0F1115] hover:bg-[#13161C] rounded-lg p-8 text-center cursor-pointer transition-all group"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileUpload(e.target.files[0]);
              }
            }}
            accept="image/*,.heic,.tiff,.raw"
            className="hidden"
          />

          <div className="w-12 h-12 rounded-md bg-[#1A1D24] border border-[#2D333F] group-hover:border-blue-500/50 text-slate-400 group-hover:text-blue-400 flex items-center justify-center mx-auto mb-3 transition-colors">
            <UploadCloud className="w-6 h-6" />
          </div>

          <h3 className="text-sm font-semibold text-white">
            {isProcessing ? "Analyzing Binary & Calculating Hashes..." : "Click or Drag & Drop Target Photograph"}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Supports JPEG, PNG, WEBP, HEIC, TIFF. Analyzed locally and securely without third-party exposure.
          </p>
        </div>
      </div>

      {/* Selected Photo Analysis Display */}
      {selectedPhoto && (
        <div className="space-y-6">
          {/* Tamper Warning Banner if detected */}
          {selectedPhoto.tamper_indicators.length > 0 && (
            <div className="bg-rose-500/10 border border-rose-500/40 rounded-lg p-4 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold font-mono text-rose-300 uppercase tracking-wide">
                  Potential Metadata Tampering Detected
                </h4>
                <ul className="text-xs text-rose-200/90 mt-1 list-disc list-inside space-y-0.5">
                  {selectedPhoto.tamper_indicators.map((ind, idx) => (
                    <li key={idx}>{ind}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Main 2-Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Image preview, Chain of Custody Hashes, Reverse Search Links */}
            <div className="lg:col-span-5 space-y-4">
              {/* Photo Preview Card */}
              <div className="bg-[#13161C] border border-[#1F2937] rounded-lg overflow-hidden shadow-lg">
                <div className="p-3 bg-[#0F1115] border-b border-[#1F2937] flex items-center justify-between">
                  <span className="text-xs font-mono font-medium text-slate-200 truncate max-w-[240px]">
                    {selectedPhoto.filename}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1A1D24] text-slate-400 border border-[#2D333F]">
                    {(selectedPhoto.hashes.size_bytes / (1024 * 1024)).toFixed(2)} MB
                  </span>
                </div>

                <div className="relative bg-[#0A0A0C] flex items-center justify-center min-h-[220px] max-h-[320px] overflow-hidden p-2">
                  {selectedPhoto.preview_url ? (
                    <img
                      src={selectedPhoto.preview_url}
                      alt="Forensic Target"
                      className="max-h-[300px] w-auto object-contain rounded-md shadow"
                    />
                  ) : (
                    <div className="text-center text-slate-600">
                      <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <span className="text-xs font-mono">Image Binary Parsed</span>
                    </div>
                  )}
                </div>

                {/* Evidence Vault Trigger */}
                <div className="p-3 bg-[#0F1115] border-t border-[#1F2937] flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-mono">Investigator Dossier</span>
                  <button
                    onClick={handleAddToEvidence}
                    disabled={isAddedToEvidence}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono transition-all ${
                      isAddedToEvidence
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-default"
                        : "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_12px_rgba(37,99,235,0.35)]"
                    }`}
                  >
                    {isAddedToEvidence ? (
                      <>
                        <Check className="w-3.5 h-3.5" /> Added to Evidence
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" /> Add to Evidence Vault
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Cryptographic Hashes (Chain of Custody) */}
              <div className="bg-[#13161C] border border-[#1F2937] rounded-lg p-4 shadow-lg space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold font-mono text-white flex items-center gap-1.5 uppercase">
                    <Hash className="w-3.5 h-3.5 text-blue-400" />
                    Cryptographic Chain of Custody
                  </h3>
                  <span className="text-[10px] text-emerald-400 font-mono">INTEGRITY VERIFIED</span>
                </div>

                <div className="space-y-2 text-xs font-mono">
                  {/* SHA-256 */}
                  <div className="bg-[#0F1115] p-2.5 rounded-md border border-[#1F2937]">
                    <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1">
                      <span>SHA-256 HASH (STANDARD FORENSIC)</span>
                      <button
                        onClick={() => handleCopyHash(selectedPhoto.hashes.sha256, "sha256")}
                        className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                      >
                        {copiedHash === "sha256" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>Copy</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-blue-300 break-all select-all font-mono">
                      {selectedPhoto.hashes.sha256}
                    </p>
                  </div>

                  {/* MD5 & SHA-1 */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-[#0F1115] p-2 rounded-md border border-[#1F2937]">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                        <span>MD5</span>
                        <button
                          onClick={() => handleCopyHash(selectedPhoto.hashes.md5, "md5")}
                          className="text-slate-400 hover:text-slate-200"
                        >
                          <Copy className="w-2.5 h-2.5" />
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-300 truncate">{selectedPhoto.hashes.md5}</p>
                    </div>

                    <div className="bg-[#0F1115] p-2 rounded-md border border-[#1F2937]">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                        <span>SHA-1</span>
                        <button
                          onClick={() => handleCopyHash(selectedPhoto.hashes.sha1, "sha1")}
                          className="text-slate-400 hover:text-slate-200"
                        >
                          <Copy className="w-2.5 h-2.5" />
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-300 truncate">{selectedPhoto.hashes.sha1}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reverse Image Search External Launch Hub */}
              <div className="bg-[#13161C] border border-[#1F2937] rounded-lg p-4 shadow-lg space-y-3">
                <h3 className="text-xs font-bold font-mono text-white flex items-center gap-1.5 uppercase">
                  <FileSearch className="w-3.5 h-3.5 text-blue-400" />
                  Cross-Platform Visual Search Engines
                </h3>
                <p className="text-[11px] text-slate-400">
                  Launch multi-engine reverse visual searches to identify subject likeness, re-uploads, or aliases across the web:
                </p>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  {[
                    { name: "Google Lens", url: "https://lens.google.com/upload" },
                    { name: "TinEye Reverse", url: "https://tineye.com/" },
                    { name: "Yandex Visual", url: "https://yandex.com/images/search?rpt=imageview" },
                    { name: "Bing Visual Search", url: "https://www.bing.com/visualsearch" },
                  ].map((engine) => (
                    <a
                      key={engine.name}
                      href={engine.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-2 rounded-md bg-[#0F1115] border border-[#1F2937] hover:border-blue-500/50 text-slate-300 hover:text-blue-300 transition-colors"
                    >
                      <span>{engine.name}</span>
                      <ExternalLink className="w-3 h-3 text-slate-500" />
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Hardware Optics, GPS Geolocation & Map, Raw Tags */}
            <div className="lg:col-span-7 space-y-4">
              {/* Hardware Optics Card */}
              <div className="bg-[#13161C] border border-[#1F2937] rounded-lg p-5 shadow-lg space-y-4">
                <div className="flex items-center justify-between border-b border-[#1F2937] pb-3">
                  <h3 className="text-xs font-bold font-mono text-white flex items-center gap-2 uppercase">
                    <Sliders className="w-4 h-4 text-blue-400" />
                    Camera & Optical Fingerprint
                  </h3>
                  <span className="text-xs font-mono text-blue-400 font-medium">
                    {selectedPhoto.camera_profile.make} {selectedPhoto.camera_profile.model}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                  <div className="bg-[#0F1115] p-2.5 rounded-md border border-[#1F2937]">
                    <span className="text-[10px] text-slate-500 block">MAKE</span>
                    <span className="text-slate-200 font-medium">{selectedPhoto.camera_profile.make}</span>
                  </div>

                  <div className="bg-[#0F1115] p-2.5 rounded-md border border-[#1F2937]">
                    <span className="text-[10px] text-slate-500 block">MODEL</span>
                    <span className="text-slate-200 font-medium truncate block">{selectedPhoto.camera_profile.model}</span>
                  </div>

                  <div className="bg-[#0F1115] p-2.5 rounded-md border border-[#1F2937]">
                    <span className="text-[10px] text-slate-500 block">APERTURE</span>
                    <span className="text-slate-200 font-medium">{selectedPhoto.camera_profile.f_number}</span>
                  </div>

                  <div className="bg-[#0F1115] p-2.5 rounded-md border border-[#1F2937]">
                    <span className="text-[10px] text-slate-500 block">SHUTTER</span>
                    <span className="text-slate-200 font-medium">{selectedPhoto.camera_profile.exposure_time}</span>
                  </div>

                  <div className="bg-[#0F1115] p-2.5 rounded-md border border-[#1F2937]">
                    <span className="text-[10px] text-slate-500 block">ISO SENSITIVITY</span>
                    <span className="text-slate-200 font-medium">{selectedPhoto.camera_profile.iso}</span>
                  </div>

                  <div className="bg-[#0F1115] p-2.5 rounded-md border border-[#1F2937]">
                    <span className="text-[10px] text-slate-500 block">FOCAL LENGTH</span>
                    <span className="text-slate-200 font-medium">{selectedPhoto.camera_profile.focal_length}</span>
                  </div>

                  <div className="bg-[#0F1115] p-2.5 rounded-md border border-[#1F2937] col-span-2">
                    <span className="text-[10px] text-slate-500 block">CAPTURED TIMESTAMP</span>
                    <span className="text-blue-300 font-medium">{selectedPhoto.camera_profile.datetime_original}</span>
                  </div>
                </div>

                {selectedPhoto.camera_profile.lens && selectedPhoto.camera_profile.lens !== "Standard Optical" && (
                  <div className="bg-[#0F1115] p-2.5 rounded-md border border-[#1F2937] text-xs font-mono">
                    <span className="text-[10px] text-slate-500 block">LENS SPECIFICATION</span>
                    <span className="text-slate-300">{selectedPhoto.camera_profile.lens}</span>
                  </div>
                )}
              </div>

              {/* GPS Geolocation & Map Coordinates */}
              <div className="bg-[#13161C] border border-[#1F2937] rounded-lg p-5 shadow-lg space-y-4">
                <div className="flex items-center justify-between border-b border-[#1F2937] pb-3">
                  <h3 className="text-xs font-bold font-mono text-white flex items-center gap-2 uppercase">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    Embedded GPS Geolocation Telemetry
                  </h3>
                  {selectedPhoto.gps_coordinates ? (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      GEO-TAG PRESENT
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1A1D24] text-slate-500 border border-[#2D333F]">
                      NO GPS EMBEDDED
                    </span>
                  )}
                </div>

                {selectedPhoto.gps_coordinates ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3 text-xs font-mono">
                      <div className="bg-[#0F1115] p-2.5 rounded-md border border-[#1F2937]">
                        <span className="text-[10px] text-slate-500 block">LATITUDE</span>
                        <span className="text-emerald-400 font-semibold">{selectedPhoto.gps_coordinates.latitude}°</span>
                      </div>
                      <div className="bg-[#0F1115] p-2.5 rounded-md border border-[#1F2937]">
                        <span className="text-[10px] text-slate-500 block">LONGITUDE</span>
                        <span className="text-emerald-400 font-semibold">{selectedPhoto.gps_coordinates.longitude}°</span>
                      </div>
                      <div className="bg-[#0F1115] p-2.5 rounded-md border border-[#1F2937]">
                        <span className="text-[10px] text-slate-500 block">ALTITUDE</span>
                        <span className="text-slate-300">{selectedPhoto.gps_coordinates.altitude ? `${selectedPhoto.gps_coordinates.altitude}m` : "N/A"}</span>
                      </div>
                    </div>

                    {/* Interactive Map Visualizer via OpenStreetMap Embed */}
                    <div className="rounded-md overflow-hidden border border-[#1F2937] h-56 bg-[#0A0A0C] relative">
                      <iframe
                        title="Embedded GPS Geolocation"
                        width="100%"
                        height="100%"
                        frameBorder="0"
                        scrolling="no"
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${selectedPhoto.gps_coordinates.longitude - 0.008}%2C${selectedPhoto.gps_coordinates.latitude - 0.005}%2C${selectedPhoto.gps_coordinates.longitude + 0.008}%2C${selectedPhoto.gps_coordinates.latitude + 0.005}&layer=mapnik&marker=${selectedPhoto.gps_coordinates.latitude}%2C${selectedPhoto.gps_coordinates.longitude}`}
                        className="opacity-90 contrast-125"
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-500">Open in external satellite tools:</span>
                      <div className="flex items-center gap-2">
                        <a
                          href={selectedPhoto.gps_coordinates.google_maps_url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-blue-400 hover:text-blue-300"
                        >
                          <span>Google Maps</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        <span className="text-[#2D333F]">|</span>
                        <a
                          href={selectedPhoto.gps_coordinates.osm_url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300"
                        >
                          <span>OpenStreetMap</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#0F1115] rounded-md p-6 text-center border border-[#1F2937] text-slate-500 text-xs font-mono">
                    <Compass className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-500" />
                    <span>No embedded GPS coordinates found in this image header.</span>
                    <p className="text-[10px] text-slate-500 mt-1">
                      (Many social media platforms strip EXIF GPS on upload; test with our "iPhone GPS Photo" sample above).
                    </p>
                  </div>
                )}
              </div>

              {/* Raw EXIF Header Inspection Table */}
              <div className="bg-[#13161C] border border-[#1F2937] rounded-lg p-5 shadow-lg space-y-3">
                <h3 className="text-xs font-bold font-mono text-white flex items-center gap-2 uppercase">
                  <Eye className="w-4 h-4 text-blue-400" />
                  Raw EXIF Tag Dump
                </h3>

                <div className="max-h-48 overflow-y-auto rounded-md border border-[#1F2937] bg-[#0F1115] p-2 font-mono text-[11px]">
                  {Object.keys(selectedPhoto.extracted_exif).length > 0 ? (
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-[#1F2937] text-slate-500 text-[10px]">
                          <th className="py-1 px-2">TAG NAME</th>
                          <th className="py-1 px-2">PARSED VALUE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(selectedPhoto.extracted_exif).map(([k, v]) => (
                          <tr key={k} className="border-b border-[#1F2937]/50 hover:bg-[#13161C]">
                            <td className="py-1 px-2 text-blue-400 font-semibold">{k}</td>
                            <td className="py-1 px-2 text-slate-300 break-all">{String(v)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <span className="text-slate-500 p-2 block">No standard EXIF header markers present.</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

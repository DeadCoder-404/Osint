export type ClassificationLevel = 
  | "UNCLASSIFIED"
  | "LAW ENFORCEMENT SENSITIVE"
  | "CONFIDENTIAL"
  | "RESTRICTED"
  | "TOP SECRET / STRICT OSINT";

export interface PlatformResult {
  id: string;
  name: string;
  category: "Developer" | "Social" | "Messaging" | "Security" | "Blogging" | "Streaming" | "Gaming" | "Audio" | "Creative" | "Professional" | "Federated" | "Photography" | "Video";
  url: string;
  status: "FOUND" | "NOT_FOUND" | "RATE_LIMITED" | "ERROR" | "TIMEOUT" | "CHECKING";
  http_code?: number;
  latency_ms?: number;
  icon?: string;
  avatarUrl?: string;
  extraDetails?: string;
}

export interface ScanSummary {
  target_username: string;
  scanned_at: string;
  total_platforms: number;
  found_count: number;
  correlation_score: number;
  platforms: PlatformResult[];
  error_message?: string;
}

export interface GPSCoordinates {
  latitude: number;
  longitude: number;
  altitude?: number | null;
  osm_url: string;
  google_maps_url: string;
}

export interface CameraProfile {
  make: string;
  model: string;
  lens: string;
  focal_length: string;
  iso: string | number;
  exposure_time: string;
  f_number: string;
  datetime_original: string;
}

export interface ImageMetadata {
  filename: string;
  hashes: {
    md5: string;
    sha1: string;
    sha256: string;
    sha512?: string;
    size_bytes: number;
  };
  is_jpeg: boolean;
  is_png: boolean;
  is_webp: boolean;
  extracted_exif: Record<string, any>;
  gps_coordinates?: GPSCoordinates | null;
  camera_profile: CameraProfile;
  software_artifacts: string[];
  tamper_indicators: string[];
  preview_url?: string;
}

export interface DorkItem {
  title: string;
  dork: string;
  category: string;
}

export interface PublicRecordsData {
  target: string;
  targetType: "domain" | "person" | "username" | "email";
  dns_records: Array<{
    name: string;
    type: string;
    ttl: number;
    data: string;
  }>;
  rdap?: {
    handle?: string;
    port43?: string;
    status?: string[];
    entities?: Array<{
      roles?: string[];
      handle?: string;
      vcard?: string | null;
    }>;
    events?: Array<{
      eventAction: string;
      eventDate: string;
    }>;
  } | null;
  dorks: DorkItem[];
  investigative_links: Array<{
    name: string;
    category: string;
    url: string;
  }>;
}

export interface EvidenceItem {
  id: string;
  title: string;
  category: "Social Handle" | "Photo Forensic" | "Public Record" | "Field Note" | "Network Asset" | "Comment / Post";
  sourceUrl?: string;
  hash?: string;
  details: string;
  timestamp: string;
  investigatorNotes?: string;
  flagged?: boolean;
}

export interface ReconComment {
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
}

export interface SubjectHumanProfile {
  handle: string;
  realName?: string;
  avatarUrl?: string;
  bio?: string;
  location?: string;
  company?: string;
  website?: string;
  estimatedPersona: string;
  communicationTone: string;
  activityHabits: string;
  keyTopics: string[];
  communities: string[];
  riskAssessment: "Low Risk / Standard User" | "Established Tech Authority" | "Suspicious / Burner Persona" | "Unknown";
  aiSummary: string;
  modelUsed: string;
  rawCommentsCount: number;
}

export interface ReconAnalysisResponse {
  query: string;
  detectedType: "url" | "fullname" | "handle";
  resolvedHandle: string;
  detectedPlatform?: string;
  profile: SubjectHumanProfile;
  comments: ReconComment[];
  platforms: PlatformResult[];
  dorks?: DorkItem[];
  scannedAt: string;
}

export interface CaseDossier {
  caseId: string;
  title: string;
  targetSubject: string;
  classification: ClassificationLevel;
  leadInvestigator: string;
  agencyOrganization: string;
  dateCreated: string;
  dateModified: string;
  status: "ACTIVE" | "PENDING_REVIEW" | "CLOSED" | "ARCHIVED";
  notes: string;
  evidence: EvidenceItem[];
  scans: ScanSummary[];
  analyzedPhotos: ImageMetadata[];
  publicRecords?: PublicRecordsData | null;
  activeRecon?: ReconAnalysisResponse | null;
  aiBriefing?: {
    summary: string;
    generatedAt: string;
    model?: string;
  } | null;
}

export interface EncryptedContainer {
  version: "AEGIS_OSINT_V1";
  caseId: string;
  encryptedAt: string;
  salt: string; // base64
  iv: string;   // base64
  ciphertext: string; // base64
  integrityHash: string; // SHA-256 of plaintext JSON
}

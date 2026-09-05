import { CaseDossier, EncryptedContainer } from "../types";

/**
 * WebCrypto AES-256-GCM Military/Forensic Grade Client-Side Encryption
 * No plaintext ever leaves the browser memory when saving encrypted dossiers.
 */

// Helper to convert ArrayBuffer to Base64
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Helper to convert Base64 to Uint8Array
function base64ToBuffer(base64: string): Uint8Array {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Derive AES-GCM Key using PBKDF2 with 100,000 iterations
async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

// Compute SHA-256 checksum
async function computeSha256(text: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(text);
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Encrypt a CaseDossier into an EncryptedContainer
 */
export async function encryptCaseDossier(
  dossier: CaseDossier,
  passphrase: string
): Promise<EncryptedContainer> {
  if (!passphrase || passphrase.length < 6) {
    throw new Error("Encryption passphrase must be at least 6 characters long.");
  }

  const jsonString = JSON.stringify(dossier);
  const integrityHash = await computeSha256(jsonString);

  // Generate 16 bytes salt and 12 bytes IV
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const key = await deriveKey(passphrase, salt);

  const enc = new TextEncoder();
  const encodedPlaintext = enc.encode(jsonString);

  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv
    },
    key,
    encodedPlaintext
  );

  return {
    version: "AEGIS_OSINT_V1",
    caseId: dossier.caseId,
    encryptedAt: new Date().toISOString(),
    salt: bufferToBase64(salt.buffer),
    iv: bufferToBase64(iv.buffer),
    ciphertext: bufferToBase64(ciphertextBuffer),
    integrityHash
  };
}

/**
 * Decrypt an EncryptedContainer into a CaseDossier
 */
export async function decryptCaseDossier(
  container: EncryptedContainer,
  passphrase: string
): Promise<CaseDossier> {
  if (!container || container.version !== "AEGIS_OSINT_V1") {
    throw new Error("Invalid or unsupported encrypted container format.");
  }

  const salt = base64ToBuffer(container.salt);
  const iv = base64ToBuffer(container.iv);
  const ciphertext = base64ToBuffer(container.ciphertext);

  let key: CryptoKey;
  try {
    key = await deriveKey(passphrase, salt);
  } catch {
    throw new Error("Key derivation failed.");
  }

  let decryptedBuffer: ArrayBuffer;
  try {
    decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv as BufferSource
      },
      key,
      ciphertext as BufferSource
    );
  } catch {
    throw new Error("Decryption failed. Incorrect passphrase or corrupted payload.");
  }

  const dec = new TextDecoder();
  const jsonString = dec.decode(decryptedBuffer);

  // Validate integrity checksum
  const currentHash = await computeSha256(jsonString);
  if (currentHash !== container.integrityHash) {
    throw new Error("Tampering detected! Payload integrity checksum mismatch.");
  }

  try {
    return JSON.parse(jsonString) as CaseDossier;
  } catch {
    throw new Error("Failed to parse decrypted dossier data.");
  }
}

/**
 * Trigger browser file download for encrypted container
 */
export function downloadEncryptedFile(container: EncryptedContainer, filename?: string) {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(container, null, 2));
  const downloadAnchor = document.createElement("a");
  const actualFilename = filename || `${container.caseId}_encrypted_report.osint.enc`;
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", actualFilename);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

/**
 * Trigger plain JSON / PDF / Markdown download
 */
export function downloadTextFile(content: string, filename: string, mimeType: string = "text/plain") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

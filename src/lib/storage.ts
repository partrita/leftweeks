import {
  DEFAULT_LIFE_EXPECTANCY,
  DEFAULT_SAMPLE_BIRTH_DATE,
  MAX_LIFE_EXPECTANCY,
  MAX_NOTE_LENGTH,
  MIN_LIFE_EXPECTANCY,
  NOTE_COLORS,
  STORAGE_KEY,
  type LifeState,
  type Locale,
  type NoteColor,
  type WeekNote,
} from "../types/life";
import { parseIsoDateToUtcMs } from "./lifeCalendar";

const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const NOTE_KEY_PATTERN = /^(\d{1,3})-(\d{1,2})$/;

const KEY_DATABASE_NAME = "leftweeks-keystore";
const KEY_DATABASE_VERSION = 1;
const KEY_STORE_NAME = "keys";
const KEY_ENTRY_NAME = "local-state-key";

const ENVELOPE_VERSION = 2;
const AES_GCM_IV_BYTES = 12;

interface EncryptedEnvelope {
  v: typeof ENVELOPE_VERSION;
  iv: string;
  data: string;
}

function isNoteColor(val: unknown): val is NoteColor {
  return typeof val === "string" && (NOTE_COLORS as readonly string[]).includes(val);
}

export function validateLifeState(input: unknown): LifeState | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return null;
  }
  const raw = input as Record<string, unknown>;
  if (raw.v !== 1) return null;

  if (typeof raw.birthDate !== "string" || parseIsoDateToUtcMs(raw.birthDate) === null) {
    return null;
  }

  if (
    typeof raw.lifeExpectancy !== "number" ||
    !Number.isInteger(raw.lifeExpectancy) ||
    raw.lifeExpectancy < MIN_LIFE_EXPECTANCY ||
    raw.lifeExpectancy > MAX_LIFE_EXPECTANCY
  ) {
    return null;
  }

  const locale: Locale = raw.locale === "en" ? "en" : "ko";

  const cleanNotes: Record<string, WeekNote> = Object.create(null) as Record<string, WeekNote>;
  if (raw.notes !== undefined) {
    if (!raw.notes || typeof raw.notes !== "object" || Array.isArray(raw.notes)) {
      return null;
    }
    for (const [key, value] of Object.entries(raw.notes as Record<string, unknown>)) {
      if (FORBIDDEN_KEYS.has(key)) continue;
      const match = NOTE_KEY_PATTERN.exec(key);
      if (!match) continue;
      const year = Number(match[1]);
      const week = Number(match[2]);
      if (year < 0 || year >= MAX_LIFE_EXPECTANCY || week < 0 || week > 51) continue;
      if (!value || typeof value !== "object" || Array.isArray(value)) continue;
      const noteObj = value as Record<string, unknown>;
      if (typeof noteObj.text !== "string") continue;
      const trimmed = noteObj.text.trim();
      if (trimmed.length === 0 || trimmed.length > MAX_NOTE_LENGTH) continue;
      if (!isNoteColor(noteObj.color)) continue;
      cleanNotes[key] = { text: trimmed, color: noteObj.color };
    }
  }

  return {
    v: 1,
    birthDate: raw.birthDate,
    lifeExpectancy: raw.lifeExpectancy,
    notes: { ...cleanNotes },
    locale,
  };
}

export function createSampleState(locale: Locale): LifeState {
  return {
    v: 1,
    birthDate: DEFAULT_SAMPLE_BIRTH_DATE,
    lifeExpectancy: DEFAULT_LIFE_EXPECTANCY,
    locale,
    notes:
      locale === "ko"
        ? {
            "19-8": { text: "대학교 입학", color: "blue" },
            "25-10": { text: "첫 직장 입사", color: "green" },
            "30-0": { text: "서른 살 생일", color: "amber" },
          }
        : {
            "19-8": { text: "Started university", color: "blue" },
            "25-10": { text: "First full-time job", color: "green" },
            "30-0": { text: "Turned 30", color: "amber" },
          },
  };
}

/**
 * Local persistence.
 *
 * The saved state holds the user's date of birth and personal notes, which the
 * app keeps on the device only. Storing that in clear text is what CodeQL's
 * `js/clear-text-storage-of-sensitive-data` warns about, so the payload is
 * encrypted with AES-GCM before it reaches `localStorage`. The key is generated
 * once per browser as a non-extractable `CryptoKey` and kept in IndexedDB: other
 * scripts cannot read it out as bytes, and a copy of `localStorage` alone holds
 * nothing but ciphertext.
 *
 * Data written by earlier versions in clear text is still readable and is
 * re-saved in encrypted form on the first load (see `loadFromLocalStorage`).
 */

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function isCryptoKey(value: unknown): value is CryptoKey {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { type?: unknown }).type === "secret" &&
    (value as { algorithm?: unknown }).algorithm !== undefined
  );
}

function openKeyDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available"));
      return;
    }
    const request = indexedDB.open(KEY_DATABASE_NAME, KEY_DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(KEY_STORE_NAME)) {
        db.createObjectStore(KEY_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Cannot open the key database"));
  });
}

async function readEncryptionKey(): Promise<CryptoKey | null> {
  const db = await openKeyDatabase();
  try {
    return await new Promise<CryptoKey | null>((resolve, reject) => {
      const request = db.transaction(KEY_STORE_NAME, "readonly").objectStore(KEY_STORE_NAME).get(KEY_ENTRY_NAME);
      request.onsuccess = () => {
        const value: unknown = request.result;
        resolve(isCryptoKey(value) ? value : null);
      };
      request.onerror = () => reject(request.error ?? new Error("Cannot read the encryption key"));
    });
  } finally {
    db.close();
  }
}

async function writeEncryptionKey(key: CryptoKey): Promise<void> {
  const db = await openKeyDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const request = db
        .transaction(KEY_STORE_NAME, "readwrite")
        .objectStore(KEY_STORE_NAME)
        .put(key, KEY_ENTRY_NAME);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error("Cannot store the encryption key"));
    });
  } finally {
    db.close();
  }
}

async function getOrCreateEncryptionKey(): Promise<CryptoKey> {
  const existing = await readEncryptionKey();
  if (existing) return existing;

  if (typeof crypto === "undefined" || !crypto.subtle) {
    throw new Error("Web Crypto is not available");
  }

  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, [
    "encrypt",
    "decrypt",
  ]);
  await writeEncryptionKey(key);
  return key;
}

function parseEnvelope(raw: string): EncryptedEnvelope | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const candidate = parsed as Record<string, unknown>;
    if (candidate.v !== ENVELOPE_VERSION) return null;
    if (typeof candidate.iv !== "string" || candidate.iv.length === 0) return null;
    if (typeof candidate.data !== "string" || candidate.data.length === 0) return null;
    return { v: ENVELOPE_VERSION, iv: candidate.iv, data: candidate.data };
  } catch {
    return null;
  }
}

async function encryptState(state: LifeState): Promise<string> {
  const key = await getOrCreateEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(AES_GCM_IV_BYTES));
  const plaintext = new TextEncoder().encode(JSON.stringify(state));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);

  const envelope: EncryptedEnvelope = {
    v: ENVELOPE_VERSION,
    iv: toBase64(iv),
    data: toBase64(new Uint8Array(ciphertext)),
  };
  return JSON.stringify(envelope);
}

async function decryptState(raw: string): Promise<LifeState | null> {
  const envelope = parseEnvelope(raw);
  if (!envelope) return null;

  const key = await readEncryptionKey();
  if (!key) return null;

  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(envelope.iv) },
    key,
    fromBase64(envelope.data),
  );
  return validateLifeState(JSON.parse(new TextDecoder().decode(plaintext)));
}

/** Reads the saved state, decrypting it (or migrating an older clear-text save). */
export async function loadFromLocalStorage(): Promise<LifeState | null> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const stored = await decryptState(raw).catch(() => null);
    if (stored) return stored;

    // State saved before encryption was added is plain JSON; keep it and
    // replace the clear-text copy as soon as it has been read.
    const legacy = validateLifeState(JSON.parse(raw));
    if (legacy) {
      await saveToLocalStorage(legacy);
    }
    return legacy;
  } catch {
    return null;
  }
}

/** Encrypts the state and writes it to local storage. */
export async function saveToLocalStorage(state: LifeState): Promise<boolean> {
  try {
    const payload = await encryptState(state);
    // The value written here is AES-GCM ciphertext (see `encryptState`); CodeQL
    // cannot follow the data through Web Crypto and reports the write as
    // clear-text storage, so the false positive is suppressed on the next line.
    // codeql[js/clear-text-storage-of-sensitive-data]
    window.localStorage.setItem(STORAGE_KEY, payload);
    return true;
  } catch {
    return false;
  }
}

export function exportStateAsJson(state: LifeState): void {
  const blob = new Blob([JSON.stringify(state, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `leftweeks-${state.birthDate}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function parseImportedJson(jsonText: string): LifeState | null {
  try {
    const parsed: unknown = JSON.parse(jsonText);
    return validateLifeState(parsed);
  } catch {
    return null;
  }
}

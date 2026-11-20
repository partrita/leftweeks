import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
} from "lz-string";
import { MAX_SHARE_URL_LENGTH, type LifeState } from "../types/life";
import { validateLifeState } from "./storage";

const HASH_PREFIX = "#s=";

export interface ShareUrlResult {
  hash: string;
  fullUrl: string;
  isTooLong: boolean;
}

export function encodeStateToHash(
  state: LifeState,
  includeNotes: boolean,
  baseUrl: string = "",
): ShareUrlResult {
  const payload: LifeState = includeNotes
    ? state
    : { ...state, notes: {} };
  const compressed = compressToEncodedURIComponent(JSON.stringify(payload));
  const hash = `${HASH_PREFIX}${compressed}`;
  const fullUrl = `${baseUrl}${hash}`;
  return {
    hash,
    fullUrl,
    isTooLong: fullUrl.length > MAX_SHARE_URL_LENGTH,
  };
}

export function decodeStateFromHash(hash: string): LifeState | null {
  if (!hash.startsWith(HASH_PREFIX)) return null;
  const encoded = hash.slice(HASH_PREFIX.length);
  if (!encoded) return null;
  try {
    const json = decompressFromEncodedURIComponent(encoded);
    if (!json) return null;
    const parsed: unknown = JSON.parse(json);
    return validateLifeState(parsed);
  } catch {
    return null;
  }
}

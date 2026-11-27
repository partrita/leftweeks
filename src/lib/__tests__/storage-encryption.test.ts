import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { STORAGE_KEY, type LifeState } from "../../types/life";
import { loadFromLocalStorage, saveToLocalStorage } from "../storage";

/**
 * Node has neither localStorage nor IndexedDB, so the test keeps both in memory
 * with just enough of the API for `storage.ts` to run unchanged.
 */
function createFakeIndexedDb() {
  const stores = new Map<string, Map<string, unknown>>();

  return {
    open() {
      const request: {
        result?: unknown;
        onsuccess?: (() => void) | null;
        onerror?: (() => void) | null;
        onupgradeneeded?: (() => void) | null;
      } = {};

      queueMicrotask(() => {
        const needsUpgrade = !stores.has("keys");
        const db = {
          objectStoreNames: { contains: (name: string) => stores.has(name) },
          createObjectStore: (name: string) => {
            stores.set(name, new Map());
            return {};
          },
          close: () => undefined,
          transaction: (storeName: string) => ({
            objectStore: () => ({
              get: (key: string) => {
                const inner: { result?: unknown; onsuccess?: (() => void) | null } = {};
                queueMicrotask(() => {
                  inner.result = stores.get(storeName)?.get(key);
                  inner.onsuccess?.();
                });
                return inner;
              },
              put: (value: unknown, key: string) => {
                const inner: { onsuccess?: (() => void) | null } = {};
                queueMicrotask(() => {
                  stores.get(storeName)?.set(key, value);
                  inner.onsuccess?.();
                });
                return inner;
              },
            }),
          }),
        };

        request.result = db;
        if (needsUpgrade) request.onupgradeneeded?.();
        request.onsuccess?.();
      });

      return request;
    },
  };
}

const sampleState: LifeState = {
  v: 1,
  birthDate: "1992-08-15",
  lifeExpectancy: 95,
  locale: "en",
  notes: { "10-2": { text: "Private note", color: "purple" } },
};

let stored: Map<string, string>;

beforeEach(() => {
  stored = new Map<string, string>();
  (globalThis as Record<string, unknown>).window = {
    localStorage: {
      getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => {
        stored.set(key, value);
      },
      removeItem: (key: string) => {
        stored.delete(key);
      },
    },
  };
  (globalThis as Record<string, unknown>).indexedDB = createFakeIndexedDb();
});

afterEach(() => {
  const globals = globalThis as Record<string, unknown>;
  delete globals.window;
  delete globals.indexedDB;
});

describe("encrypted local storage", () => {
  it("never writes the birth date or notes in clear text", async () => {
    await expect(saveToLocalStorage(sampleState)).resolves.toBe(true);

    const raw = stored.get(STORAGE_KEY);
    expect(raw).toBeTruthy();
    expect(raw).not.toContain("1992-08-15");
    expect(raw).not.toContain("Private note");
    expect(JSON.parse(raw as string)).toMatchObject({ v: 2 });
  });

  it("reads back what it saved", async () => {
    await saveToLocalStorage(sampleState);
    await expect(loadFromLocalStorage()).resolves.toEqual(sampleState);
  });

  it("migrates state saved by earlier versions in clear text", async () => {
    stored.set(STORAGE_KEY, JSON.stringify(sampleState));

    await expect(loadFromLocalStorage()).resolves.toEqual(sampleState);

    const migrated = stored.get(STORAGE_KEY) as string;
    expect(migrated).not.toContain("1992-08-15");
    expect(JSON.parse(migrated)).toMatchObject({ v: 2 });
    await expect(loadFromLocalStorage()).resolves.toEqual(sampleState);
  });

  it("returns null instead of throwing on unreadable data", async () => {
    stored.set(STORAGE_KEY, "not json at all");
    await expect(loadFromLocalStorage()).resolves.toBeNull();

    stored.delete(STORAGE_KEY);
    await expect(loadFromLocalStorage()).resolves.toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { decodeStateFromHash, encodeStateToHash } from "../shareUrl";
import type { LifeState } from "../../types/life";

const sampleState: LifeState = {
  v: 1,
  birthDate: "1995-05-12",
  lifeExpectancy: 90,
  locale: "ko",
  notes: {
    "20-5": { text: "졸업", color: "blue" },
    "30-0": { text: "서른", color: "amber" },
  },
};

describe("shareUrl", () => {
  it("round-trips state with notes included", () => {
    const { hash } = encodeStateToHash(sampleState, true, "https://example.com/leftweeks/");
    const decoded = decodeStateFromHash(hash);
    expect(decoded).toEqual(sampleState);
  });

  it("strips notes when includeNotes is false", () => {
    const { hash } = encodeStateToHash(sampleState, false, "https://example.com/leftweeks/");
    const decoded = decodeStateFromHash(hash);
    expect(decoded).toEqual({ ...sampleState, notes: {} });
  });

  it("returns null on corrupted or empty hash", () => {
    expect(decodeStateFromHash("")).toBeNull();
    expect(decodeStateFromHash("#s=not-valid-lz")).toBeNull();
  });

  it("flags URLs exceeding 2000 characters", () => {
    const bigNotes: LifeState["notes"] = {};
    for (let i = 0; i < 150; i++) {
      const year = Math.floor(i / 52);
      const week = i % 52;
      bigNotes[`${year}-${week}`] = {
        text: `Event ${i} (${(i * 7919) % 100000}) - unique milestone note ${String.fromCharCode(65 + (i % 26))}${i * 13}`,
        color: "green",
      };
    }
    const result = encodeStateToHash(
      { ...sampleState, notes: bigNotes },
      true,
      "https://example.com/leftweeks/",
    );
    expect(result.isTooLong).toBe(true);
  });
});

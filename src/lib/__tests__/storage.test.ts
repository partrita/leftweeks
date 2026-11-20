import { describe, expect, it } from "vitest";
import { parseImportedJson, validateLifeState } from "../storage";

describe("storage validation", () => {
  it("accepts valid v1 state and strips prototype-pollution or overlong notes", () => {
    const json = JSON.stringify({
      v: 1,
      birthDate: "1992-08-15",
      lifeExpectancy: 95,
      locale: "en",
      notes: {
        "10-2": { text: "Valid note", color: "purple" },
        "10-3": { text: "a".repeat(121), color: "blue" },
        __proto__: { text: "evil", color: "rose" },
      },
    });
    const parsed = parseImportedJson(json);
    expect(parsed).not.toBeNull();
    expect(parsed?.notes).toEqual({
      "10-2": { text: "Valid note", color: "purple" },
    });
  });

  it("rejects invalid schema versions, dates, or out-of-range lifeExpectancy", () => {
    expect(validateLifeState({ v: 2, birthDate: "1995-01-01", lifeExpectancy: 90 })).toBeNull();
    expect(validateLifeState({ v: 1, birthDate: "1995-02-30", lifeExpectancy: 90 })).toBeNull();
    expect(validateLifeState({ v: 1, birthDate: "1995-01-01", lifeExpectancy: 40 })).toBeNull();
    expect(parseImportedJson("{invalid json")).toBeNull();
  });
});

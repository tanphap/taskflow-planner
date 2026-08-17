import { describe, expect, it } from "vitest";
import { SUPPORTED_LANGUAGES } from "@/lib/languageOptions";

describe("TaskFlow language translations", () => {
  it("offers Vietnamese and English as supported interface languages", () => {
    expect(SUPPORTED_LANGUAGES).toEqual(["vi", "en"]);
  });

  it("contains no duplicate language option", () => {
    expect(new Set(SUPPORTED_LANGUAGES).size).toBe(SUPPORTED_LANGUAGES.length);
  });
});

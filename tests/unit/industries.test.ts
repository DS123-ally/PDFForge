import { describe, expect, it } from "vitest";

import { industries } from "@/config/industries";
import { indexablePaths } from "@/config/site";
import { getRecipePreset } from "@/lib/recipes/recipe";

describe("industry pages", () => {
  it("points CA, law, and HR at recipes that already exist", () => {
    expect(industries.map((page) => page.slug)).toEqual([
      "ca-firms",
      "law-firms",
      "hr",
    ]);

    for (const page of industries) {
      expect(page.presetId).toBe("send-externally");
      expect(getRecipePreset(page.presetId)?.id).toBe(page.presetId);
      expect(getRecipePreset(page.matchingPresetId)?.id).toBe(
        page.matchingPresetId,
      );
      expect(page.matchingPresetId).not.toBe(page.presetId);
      expect(indexablePaths).toContain(`/for/${page.slug}`);
    }
  });
});

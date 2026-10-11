import { describe, expect, it } from "vitest";

import { getToolPrivacy, toolPrivacy } from "@/config/tool-privacy";
import { tools } from "@/config/tools";

describe("tool privacy details", () => {
  it("states what every tool reads and what the download contains", () => {
    expect(toolPrivacy.map((entry) => entry.slug).sort()).toEqual(
      tools.map((tool) => tool.slug).sort(),
    );

    for (const tool of tools) {
      const privacy = getToolPrivacy(tool.slug);
      expect(privacy?.reads.length).toBeGreaterThan(0);
      expect(privacy?.writes.length).toBeGreaterThan(0);
    }
  });
});

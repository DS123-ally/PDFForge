import { describe, expect, it } from "vitest";

import { createOutputName } from "@/lib/files/create-output-name";

describe("createOutputName", () => {
  it("adds a safe suffix before the output extension", () => {
    expect(
      createOutputName("Quarterly Report.pdf", {
        suffix: "merged",
      }),
    ).toBe("Quarterly-Report-merged.pdf");
  });

  it("removes path and reserved filename characters", () => {
    expect(
      createOutputName("C:\\temp\\signed:approval?.pdf", {
        extension: "zip",
        suffix: "pages",
      }),
    ).toBe("signed-approval-pages.zip");
  });
});

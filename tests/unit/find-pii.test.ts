import { describe, expect, it } from "vitest";

import { findPiiMatches } from "@/lib/pdf/find-pii";

const pageSize = { height: 420, width: 320 };

describe("findPiiMatches", () => {
  it("finds emails, phones, ID-like numbers, and a custom phrase", () => {
    const runs = [
      run("Email  ", 20, 360),
      run("jane.doe@example.com", 70, 360, 140),
      run("  call 555-123-4567 id 123-45-6789 CONFIDENTIAL", 20, 300, 260),
    ];

    const matches = findPiiMatches(
      runs,
      {
        customPhrase: "CONFIDENTIAL",
        presets: ["email", "phone", "id"],
      },
      pageSize,
    );

    expect(matches.map((match) => match.kind).sort()).toEqual([
      "custom",
      "email",
      "id",
      "phone",
    ]);
    expect(matches.some((match) => match.text.includes("jane.doe"))).toBe(true);
    expect(matches.every((match) => match.box.width > 0)).toBe(true);
  });

  it("returns nothing when no patterns are enabled", () => {
    expect(
      findPiiMatches(
        [run("jane.doe@example.com", 20, 360)],
        { presets: [] },
        pageSize,
      ),
    ).toEqual([]);
  });
});

function run(str: string, x: number, y: number, width = 80) {
  return {
    height: 12,
    pageNumber: 1,
    str,
    width,
    x,
    y,
  };
}

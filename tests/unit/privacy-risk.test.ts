import { describe, expect, it } from "vitest";

import {
  findPrivacyRiskMatches,
  isValidAadhaar,
  isValidCardNumber,
} from "@/lib/pdf/privacy-risk";

const pageSize = { height: 420, width: 520 };

describe("privacy risk detectors", () => {
  it("validates Aadhaar with Verhoeff and cards with Luhn", () => {
    const aadhaar = makeValidAadhaar("23412341234");

    expect(isValidAadhaar(aadhaar)).toBe(true);
    expect(isValidAadhaar("123412341234")).toBe(false);
    expect(isValidCardNumber("4111111111111111")).toBe(true);
    expect(isValidCardNumber("4111111111111112")).toBe(false);
  });

  it("finds Indian identifiers, contact data, and payment cards", () => {
    const aadhaar = makeValidAadhaar("49911866524");
    const line = `PAN ABCDE1234F GST 27ABCDE1234F1Z5 IFSC HDFC0001234 Aadhaar ${aadhaar} card 4111 1111 1111 1111 mail jane.doe@example.com phone 9876543210 DOB 12/03/1991 https://example.com IBAN DE89370400440532013000`;

    const matches = findPrivacyRiskMatches([run(line, 20, 360, 480)], pageSize);
    const kinds = [...new Set(matches.map((match) => match.kind))].sort();

    expect(kinds).toEqual(
      expect.arrayContaining([
        "aadhaar",
        "bank",
        "card",
        "dob",
        "email",
        "gst",
        "ifsc",
        "pan",
        "phone",
        "url",
      ]),
    );
    expect(matches.some((match) => match.kind === "pan")).toBe(true);
    expect(matches.every((match) => match.box.width > 0)).toBe(true);
  });

  it("does not treat a GSTIN as a second PAN on the same span", () => {
    const matches = findPrivacyRiskMatches(
      [run("GSTIN 27ABCDE1234F1Z5", 20, 360, 220)],
      pageSize,
    );

    expect(matches.map((match) => match.kind)).toEqual(["gst"]);
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

function makeValidAadhaar(base11: string) {
  for (let digit = 0; digit <= 9; digit += 1) {
    const candidate = `${base11}${digit}`;

    if (isValidAadhaar(candidate)) {
      return candidate;
    }
  }

  throw new Error("Could not build a Verhoeff-valid Aadhaar fixture.");
}

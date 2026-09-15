import { PDFDocument, PDFName, StandardFonts } from "pdf-lib";
import { describe, expect, it } from "vitest";

import { stripJpegApp1Exif } from "@/lib/pdf/jpeg-exif";
import { auditPdfPrivacy } from "@/lib/pdf/privacy-audit";
import { sanitizePdfBuffer } from "@/lib/pdf/privacy-sanitize";
import { createPngBytes, toArrayBuffer } from "../fixtures/pdf";

describe("privacy inspector", () => {
  it("reports metadata, attachments, JavaScript, and form values", async () => {
    const source = await createLeakyPdf();
    const report = await auditPdfPrivacy(source);

    expect(report.standardMetadata.title).toBe("Secret title");
    expect(report.attachments.some((name) => name.includes("notes.txt"))).toBe(
      true,
    );
    expect(report.javascript.length).toBeGreaterThan(0);
    expect(
      report.formFields.some(
        (field) => field.name === "ssn" && field.value.includes("123-45"),
      ),
    ).toBe(true);
    expect(report.findings.map((finding) => finding.category)).toEqual(
      expect.arrayContaining([
        "metadata",
        "attachments",
        "javascript",
        "forms",
      ]),
    );
  });

  it("counts extra %%EOF markers as incremental leftovers", async () => {
    const pdf = await PDFDocument.create();
    pdf.addPage([200, 200]);
    const once = await pdf.save();
    const doubled = new Uint8Array(once.length + 7);
    doubled.set(once);
    doubled.set(new TextEncoder().encode("\n%%EOF\n"), once.length);

    const report = await auditPdfPrivacy(doubled);
    expect(report.incrementalEofCount).toBeGreaterThan(1);
    expect(
      report.findings.some((finding) => finding.category === "incremental"),
    ).toBe(true);
  });
});

describe("privacy sanitize", () => {
  it("writes a cleaned copy that drops reported leak sources", async () => {
    const source = await createLeakyPdf();

    const result = await sanitizePdfBuffer(
      source,
      {
        dropAttachments: true,
        dropJavascript: true,
        flattenForms: false,
        stripFormValues: true,
        stripImageExif: true,
        stripMetadata: true,
      },
      "leaky.pdf",
    );
    const cleaned = await auditPdfPrivacy(result.outputBytes);

    expect(result.filename).toBe("leaky-sanitized.pdf");
    expect(cleaned.standardMetadata.title).toBe("");
    expect(cleaned.standardMetadata.author).toBe("");
    expect(cleaned.attachments).toEqual([]);
    expect(cleaned.javascript).toEqual([]);
    expect(cleaned.formFields.every((field) => !field.value)).toBe(true);
  });

  it("strips JPEG APP1 Exif segments", () => {
    const jpeg = createTinyJpegWithExif();
    const stripped = stripJpegApp1Exif(jpeg);

    expect(new TextDecoder("latin1").decode(jpeg)).toContain("Exif");
    expect(new TextDecoder("latin1").decode(stripped)).not.toContain("Exif");
  });
});

async function createLeakyPdf() {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const page = pdf.addPage([320, 420]);

  page.drawText("Visible invoice", { font, size: 14, x: 36, y: 360 });
  pdf.setTitle("Secret title");
  pdf.setAuthor("Hidden author");
  pdf.addJavaScript("open", "app.alert('leak');");
  await pdf.attach(Uint8Array.from(createPngBytes()), "notes.txt", {
    mimeType: "text/plain",
    description: "Private notes",
  });

  const form = pdf.getForm();
  const field = form.createTextField("ssn");
  field.setText("123-45-6789");
  field.addToPage(page, { x: 36, y: 280, width: 160, height: 24 });

  pdf.catalog.set(
    PDFName.of("Metadata"),
    pdf.context.register(
      pdf.context.stream("<?xpacket?><x:xmpmeta>secret-xmp</x:xmpmeta>", {}),
    ),
  );

  return toArrayBuffer(await pdf.save());
}

function createTinyJpegWithExif() {
  const soi = [0xff, 0xd8];
  const exifBody = [...new TextEncoder().encode("Exif\0\0II")];
  const app1Length = exifBody.length + 2;
  const app1 = [
    0xff,
    0xe1,
    (app1Length >> 8) & 0xff,
    app1Length & 0xff,
    ...exifBody,
  ];
  const eoi = [0xff, 0xd9];
  return Uint8Array.from([...soi, ...app1, ...eoi]);
}

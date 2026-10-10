export const pdfForgeProcessing = "processed in the browser";

export type UploadComparison = {
  checked: string;
  description: string;
  intro: string;
  note: string;
  product: string;
  rows: Array<{ item: string; uploads: string }>;
  slug: string;
  sources: Array<{ href: string; label: string }>;
  title: string;
};

export const comparisons: readonly UploadComparison[] = [
  {
    slug: "ilovepdf",
    product: "iLovePDF",
    title: "PDFForge vs iLovePDF",
    description:
      "What iLovePDF uploads when you use its web tools, and what PDFForge keeps in the browser.",
    intro:
      "iLovePDF’s web tools take the file onto iLovePDF servers to do the work. PDFForge runs the same kind of task in this browser.",
    checked: "10 October 2026",
    note: "iLovePDF’s privacy policy, revised 19 February 2026, says standard tool files are deleted within two hours of processing. iLoveSign documents are kept longer. iLovePDF says it does not access or analyze file content beyond providing the service.",
    sources: [
      {
        href: "https://www.ilovepdf.com/help/privacy",
        label: "iLovePDF privacy policy",
      },
      {
        href: "https://www.ilovepdf.com/help/security",
        label: "iLovePDF security page",
      },
      {
        href: "https://www.ilovepdf.com/help/terms",
        label: "iLovePDF terms",
      },
    ],
    rows: [
      {
        item: "The PDF you open",
        uploads:
          "Uploaded to iLovePDF servers. Standard tool files are deleted within two hours.",
      },
      {
        item: "Images you convert",
        uploads:
          "Uploaded to iLovePDF servers, then deleted within two hours for standard tools.",
      },
      {
        item: "Word, Excel, and PowerPoint files",
        uploads:
          "Uploaded for conversion, then deleted within two hours for standard tools.",
      },
      {
        item: "Text the tool reads, including OCR",
        uploads:
          "Uploaded inside the file. iLovePDF says it does not analyze content beyond providing the service.",
      },
      {
        item: "Metadata, attachments, and form values",
        uploads: "Uploaded inside the file and processed on iLovePDF servers.",
      },
      {
        item: "Signed documents",
        uploads:
          "Uploaded for iLoveSign and kept longer. The security page says signed documents can be retained for up to five years.",
      },
    ],
  },
  {
    slug: "smallpdf",
    product: "Smallpdf",
    title: "PDFForge vs Smallpdf",
    description:
      "What Smallpdf’s website tools upload, and what PDFForge keeps in the browser.",
    intro:
      "Smallpdf’s privacy notice says its PDF services upload the file you provide. PDFForge does that work in this browser. This page is about the Smallpdf website, not a different site with a similar name.",
    checked: "10 October 2026",
    note: "Smallpdf’s privacy notice, updated 29 July 2025, says logged-in files are deleted within one hour unless you save them. Logged-out files are kept for a period after they were last opened, and opening a file again extends that period. Saved files are generally deleted within 14 days after you delete them.",
    sources: [
      {
        href: "https://smallpdf.com/privacy",
        label: "Smallpdf privacy notice",
      },
    ],
    rows: [
      {
        item: "The PDF you open",
        uploads:
          "Uploaded as a User File, along with the file name, type, and size. Logged-in copies are deleted within one hour unless you save them. Logged-out copies stay until a period after they were last opened, and opening the file again extends that period.",
      },
      {
        item: "Images you convert",
        uploads: "Uploaded as User Files under the same retention rules.",
      },
      {
        item: "Word, Excel, and PowerPoint files",
        uploads: "Uploaded for conversion under the same retention rules.",
      },
      {
        item: "Text used for conversion or AI tools",
        uploads:
          "Uploaded with the file. Smallpdf says AI tools do not keep a persistent copy unless you save the result.",
      },
      {
        item: "File name and other metadata",
        uploads:
          "Processed with the upload. The privacy notice lists file name, type, and size.",
      },
      {
        item: "A file you save in an account",
        uploads:
          "Uploaded, then kept until you delete it. Smallpdf generally removes it within 14 days after that.",
      },
      {
        item: "A share link or eSign request",
        uploads:
          "Uploaded. Anyone with the share link can open the processed file unless you turn that off. eSign stores the signature and emails the request.",
      },
    ],
  },
  {
    slug: "adobe",
    product: "Adobe Acrobat online",
    title: "PDFForge vs Adobe Acrobat online",
    description:
      "What Adobe Acrobat online uploads to Adobe cloud storage, and what PDFForge keeps in the browser.",
    intro:
      "Adobe’s Acrobat online FAQ says those browser tools upload your file to Adobe cloud storage. PDFForge runs the task in this browser. Acrobat desktop, which can edit a file on the computer where it is installed, is a different product and is not in this table.",
    checked: "10 October 2026",
    note: "Adobe’s Acrobat online FAQ, updated 2 June 2025, says a file is deleted within a short time if you do not sign in. If you sign in to use, save, or share a tool, Acrobat saves the file to your Adobe account. Adobe’s privacy policy says it may analyze cloud content to improve products unless you opt out.",
    sources: [
      {
        href: "https://helpx.adobe.com/document-cloud/faq/try-acrobat-online-services.html",
        label: "Adobe Acrobat online FAQ",
      },
      {
        href: "https://www.adobe.com/privacy/policy.html",
        label: "Adobe privacy policy",
      },
    ],
    rows: [
      {
        item: "The PDF you open in Acrobat online",
        uploads:
          "Uploaded to Adobe cloud storage. Without a sign-in, Adobe deletes it within a short time. With a sign-in, it is saved to the Adobe account.",
      },
      {
        item: "Images you convert",
        uploads:
          "Uploaded to Adobe cloud storage. Adobe lists JPG, PNG, TIFF, and other image types.",
      },
      {
        item: "Word, Excel, and PowerPoint files",
        uploads: "Uploaded to Adobe cloud storage for conversion.",
      },
      {
        item: "Text inside the file",
        uploads: "Uploaded with the file and processed in Adobe cloud storage.",
      },
      {
        item: "Metadata, form values, and attachments",
        uploads:
          "Uploaded inside the file. Adobe stores cloud content on its servers.",
      },
      {
        item: "A file you save or share",
        uploads:
          "Uploaded to Adobe cloud storage and saved in the Adobe account until you delete it. Adobe may analyze cloud content to improve products unless you opt out.",
      },
    ],
  },
];

export function getComparison(slug: string) {
  return comparisons.find((page) => page.slug === slug);
}

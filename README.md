# PDFForge

PDFForge is a free, privacy-first PDF utility suite. Document processing is designed to happen locally in the browser: files, extracted text, metadata, and passwords must not be uploaded or logged.

The linked Figma source currently contains the placeholder brand “PDFLocal.” **PDFForge is the confirmed public product name**, so implementation must retain the design language while replacing PDFLocal labels and logos.

## Project status

Phase 12 (Privacy and security audit) is complete pending approval. Security headers and CSP are enabled, temporary object URLs and workers are cleared on page hide, and the privacy policy matches actual local-only behaviour. SEO and release work remain later phases.

- Architecture and roadmap: [`docs/architecture.md`](docs/architecture.md)
- Privacy audit: [`docs/privacy-audit.md`](docs/privacy-audit.md)
- Figma prototype: [PDFLocal — Privacy-First PDF Tools](https://www.figma.com/proto/eSdbWCDJ0EqKUPESoR66nx/PDFLocal-%E2%80%94-Privacy-First-PDF-Tools?node-id=0-1)

## Current stack

- Next.js 16 App Router, React 19, and TypeScript
- Tailwind CSS 4
- `pdfjs-dist` for PDF parsing and rendering
- `pdf-lib` for supported document mutations
- `pdf-lib-encrypt` for AES-256 password protection and supported unlocks
- JSZip for multi-file downloads
- Lucide React for icons
- `clsx` and `tailwind-merge` for component class composition
- npm, selected by the committed `package-lock.json`
- Production service worker and web app manifest for the offline application shell

Vitest, Testing Library, Playwright, Prettier, strict type checking, and GitHub Actions CI are configured. PDF mutations run in a dedicated module Web Worker; PDF rendering, text extraction, and image export use PDF.js and same-origin browser APIs.

## Static routes

- `/` — responsive landing page
- `/tools` — searchable, category-filtered tool directory (category in the URL hash)
- `/workspace` — local tool workspace (selected tool in the URL hash)
- `/tools/[tool]` — redirects into the hash workspace
- `/tools/merge-pdf/states` — processing and completion state reference
- `/privacy`, `/about`, and `/offline` — supporting product pages

## Prerequisites

- Node.js 24 is recommended. The installed `pdfjs-dist@6.3.289` requires Node `>=22.13.0` or `>=24` for development tooling.
- npm 11 or another version compatible with the installed Node release.

## Local setup

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Quality checks

```bash
npm run lint
npm run typecheck
npm run test:unit
npm run audit
npm run build
npm run test:e2e
```

Install Playwright's browser engines once before the first E2E run:

```bash
npx playwright install chromium firefox webkit
```

`npm run test:e2e` runs the built application on localhost port 3100. Run `npm run build` first when the production output is not current.

## Privacy invariants

- No document bytes or derived document content may be sent to an application server or third party.
- Never log filenames, document text, metadata, passwords, or raw processing errors that may contain them.
- Use in-memory buffers and object URLs by default; use IndexedDB only for explicit, temporary recovery needs.
- Revoke object URLs, terminate workers, release references, and delete temporary browser records after completion or cancellation.
- Self-host PDF.js workers, fonts, icons, and other runtime assets. No CDN is allowed in the document-processing path.
- Analytics and error monitoring must use an explicit allowlist of non-document fields.

## Phase discipline

Work on one approved phase at a time. Each phase must finish with lint, type checking, relevant tests, a production build, known limitations, and manual testing instructions before the next phase begins.

# PDFForge architecture and delivery plan

Status: Phase 0 decision record  
Date: 2026-09-11  
Scope: architecture and planning only; no product features are implemented

## 1. Executive summary

PDFForge will be a static-first Next.js application whose interface is served by ordinary web hosting while every document operation runs in the browser. The trusted processing boundary is the user's tab and dedicated Web Workers. There is no document API, account system, database, or server-side PDF processing.

The repository is a minimal Create Next App project. It is an appropriate base, but it lacks the target folder structure, tests, worker wiring, CI, product metadata, and error boundaries. Those belong to Phase 1. Existing uncommitted dependency changes are preserved.

Merge PDF remains the first production feature because it exercises validation, corrupt/encrypted input handling, worker orchestration, progress, cancellation, ordering, downloads, cleanup, accessibility, and privacy verification.

## 2. Repository assessment

| Area            | Current state                                                     | Decision                                                              |
| --------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------- |
| Repository      | Git repository on `main`, one initial commit                      | Preserve user changes; never reset them                               |
| Framework       | Next.js 16.3.4 App Router, React 19.2.8                           | Keep App Router; static marketing routes and client-side tool islands |
| Language        | TypeScript 5 strict mode; `@/*` maps to repository root           | Keep strict mode; move alias to `src/*` in Phase 1                    |
| Styling         | Tailwind CSS 4 through PostCSS                                    | Keep; translate Figma values into CSS variables/theme tokens          |
| Package manager | `package-lock.json`                                               | npm is authoritative                                                  |
| PDF libraries   | `pdfjs-dist`, `pdf-lib`, JSZip                                    | Suitable for viewing and common edits, but not all security features  |
| UI libraries    | Lucide, clsx, tailwind-merge                                      | Small and appropriate                                                 |
| Tests and CI    | Vitest, Testing Library, Playwright, Prettier, and GitHub Actions | Foundation checks run locally and in CI                               |
| Application     | Minimal PDFForge page; external Google font import removed        | No PDF functionality exists; use local/system assets only             |
| Workstation     | Node v24.14.0 and npm 11.17.0                                     | Supported development environment                                     |

`package.json` and `package-lock.json` were modified before Phase 0 to add the intended runtime packages. This phase does not modify or revert them.

## 3. Figma and product assessment

The confirmed public name is **PDFForge**. The current Figma file and visible logo use **PDFLocal** as placeholder copy. Phase 2 must preserve the visual system while replacing all PDFLocal labels and brand marks with PDFForge.

The reviewed prototype contains seven frames:

1. Desktop homepage.
2. Alternate desktop homepage/upload treatment.
3. Mobile homepage with privacy statement, upload zone, and tools.
4. Desktop Merge PDF configuration with populated files.
5. Mobile Merge PDF configuration with uploader and file cards.
6. Merge processing state with progress and privacy reassurance.
7. UI-system reference covering palette and typography.

Visible design direction:

- White canvas, black typography, and a strong red action color.
- Compact logo, simple header, and mobile hamburger navigation.
- Large bold sans-serif headings and restrained supporting text.
- Red dashed upload zones, soft red icon surfaces, rounded cards, and gray borders.
- Privacy messaging beside upload and processing actions.
- Deliberate desktop and mobile layouts rather than a scaled desktop canvas.

The prototype does not show every Phase 2 route or all empty, error, success, modal, toast, disabled, hover, and focus states. Missing states must extend the component-library language and receive design review.

### Major pages

- `/`: homepage and featured tools.
- `/tools`: searchable and filterable tool directory.
- `/tools/[tool]`: shared shell created only for implemented tools.
- `/privacy`: local-processing and retention policy.
- `/about`: purpose, limitations, and browser support.
- `not-found`: accessible 404.
- `/offline`: added only with the later service worker.

### Reusable component groups

- Layout: header, desktop/mobile navigation, footer, skip link, container.
- Discovery: search, category filters, tool card, related tools.
- Intake: drop zone, picker, privacy notice, file list/row, validation summary.
- PDF display: page canvas, thumbnail, virtualized grid, selection, zoom.
- Workflow: settings, progress, cancellation, status, result, mobile action bar.
- Feedback: modal, toast/live region, empty/error states, error boundaries.
- Primitives: buttons, inputs, selects, checkbox, slider, card, badge, tooltip.

## 4. Proposed folder structure

```text
src/
├── app/
│   ├── (marketing)/
│   ├── tools/[tool]/
│   ├── offline/
│   ├── error.tsx
│   ├── global-error.tsx
│   ├── layout.tsx
│   └── not-found.tsx
├── components/
│   ├── layout/
│   ├── pdf/
│   ├── tools/
│   └── ui/
├── config/
├── hooks/
├── lib/
│   ├── files/
│   ├── pdf/
│   ├── privacy/
│   ├── validation/
│   └── workers/
├── types/
└── workers/
    └── pdf-processing.worker.ts
public/
├── icons/
└── vendor/pdfjs/
tests/
├── unit/
├── integration/
├── e2e/
└── fixtures/
docs/
scripts/
└── copy-pdfjs-worker.mjs
```

Rules:

- UI components never manipulate PDF bytes directly.
- `lib/files` owns `File` validation, naming, object URLs, and downloads.
- `lib/pdf` contains deterministic document operations that can run in a worker.
- `lib/workers` is the typed client bridge; `workers` contains entry points.
- PDF libraries load lazily on tool routes, never in the homepage bundle.
- Typed tool configuration controls navigation, metadata, and indexing so unfinished tools remain private.

## 5. Browser-processing architecture

```text
File objects
  -> validation and temporary registry in the tab
  -> PDF.js rendering worker -> canvases/thumbnails
  -> processing worker -> pdf-lib/JSZip -> transferable ArrayBuffer
  -> Blob/object URL -> user download
  -> revoke URL, terminate/idle worker, release references
```

### PDF.js worker

Self-host the exact `pdf.worker.min.mjs` included with the pinned `pdfjs-dist` version. A build script will copy it to `public/vendor/pdfjs/pdf.worker.min.mjs`; the client will set `GlobalWorkerOptions.workerSrc` to that same-origin path. This avoids a CDN, supports a strict Content Security Policy, prevents library/worker drift, and is predictable across development and production.

The copy step must fail if its source is missing, and CI must verify the output. PDF.js's fake-worker fallback is not acceptable in production.

### Processing worker

Use a separate module Web Worker for mutations and ZIP creation. Its discriminated message protocol includes operation ID, operation type, serializable input, progress, success, cancellation, and sanitized error variants. Transfer `ArrayBuffer` ownership instead of cloning large buffers.

Cancellation is cooperative. Loops check an abort flag between pages/files. A single non-interruptible library call may only support cancellation after its current step; the UI must describe that accurately.

### Storage and lifecycle

- Default to memory: `File`, `ArrayBuffer`, `Blob`, and tracked object URLs.
- Use IndexedDB only for an approved temporary-recovery feature with expiry and cleanup tests.
- Never store file content, passwords, extracted text, or metadata in `localStorage`.
- Revoke object URLs on replacement, completion, cancellation, route exit, and unmount.
- Promise reference release and browser-record deletion, not impossible guarantees about immediate JavaScript heap erasure.

### Network boundary

The app may fetch only versioned application assets, navigation documents, update metadata, and privacy-safe monitoring endpoints. Processing modules must not call `fetch`, XHR, `sendBeacon`, WebSocket, or third-party SDKs. An end-to-end test will intercept every request during tool use and fail if URLs, headers, or bodies contain document-derived values.

## 6. Dependencies and reasons

### Present and retained

| Dependency            | Purpose                                               | Constraint                                     |
| --------------------- | ----------------------------------------------------- | ---------------------------------------------- |
| Next.js / React       | Routing and UI                                        | Keep document logic in lazy client boundaries  |
| TypeScript            | Typed contracts and worker messages                   | Strict mode stays enabled                      |
| Tailwind CSS          | Figma-derived tokens and responsive layout            | Use semantic reusable components               |
| `pdfjs-dist`          | Parse, inspect, render, page count, password prompts  | Self-host matching worker; no CDN              |
| `pdf-lib`             | Merge, split, copy, rotate, metadata, overlays, forms | Does not cover every encryption/redaction need |
| JSZip                 | Multi-output ZIP creation                             | Run large jobs in a worker                     |
| Lucide React          | Accessible interface icons                            | Prefer supplied Figma icons when present       |
| clsx + tailwind-merge | Component class composition                           | Centralize through `cn()`                      |

### Added in Phase 1

- Vitest, jsdom, Testing Library, and user-event for unit/component tests.
- Playwright for cross-browser end-to-end and privacy network assertions.
- Prettier and its Tailwind plugin for deterministic formatting.

Avoid a state library until reducers/context prove inadequate. Do not add upload, authentication, ORM, database, or telemetry packages.

## 7. Supported browsers

Tier 1:

- Latest and previous stable Chrome and Edge on desktop.
- Latest and previous stable Firefox on desktop.
- Latest stable Safari on macOS and iOS.
- Latest stable Chrome on Android.

Best-effort compatibility floor: Chromium 120, Firefox 121, and Safari/iOS 17.4. Gate tools through capability checks for module workers, transferable buffers, Canvas, Blob URLs, File APIs, IndexedDB, and WebAssembly where used. Unsupported browsers receive a clear message before file selection.

Mobile support means accessible layout and safe processing, not equal memory capacity. Touch targets are at least 44 by 44 CSS pixels, and every drag interaction has button and keyboard alternatives.

## 8. Recommended capacity limits

These are soft recommendations. Compressed PDFs can expand several times in memory, and page complexity matters more than bytes.

| Device         | Per file |  Batch |      Page warning |
| -------------- | -------: | -----: | ----------------: |
| Desktop/laptop |   250 MB | 500 MB | Above 1,000 pages |
| Tablet         |   125 MB | 250 MB |   Above 600 pages |
| Phone          |    75 MB | 150 MB |   Above 300 pages |

Estimate peak use from input bytes, decoded canvases, output duplication, and ZIP buffers. Warn when an operation may exceed 25% of reported device memory, when that signal exists, but never rely on it. Render only visible pages, cap concurrent renders, and lower preview resolution before rejecting a document.

## 9. Capability and limitation review

| Feature                               | Browser-only status                                              | Decision                                                 |
| ------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------- |
| View, thumbnails, page count          | Reliable with PDF.js                                             | MVP                                                      |
| Merge, split, reorder, rotate         | Reliable for ordinary PDFs with pdf-lib                          | MVP                                                      |
| Images to PDF                         | Reliable with explicit layout rules                              | MVP                                                      |
| PDF to PNG/JPG                        | Reliable by rasterizing; memory-heavy at high resolution         | MVP with warnings                                        |
| Text extraction                       | Works for text-layer PDFs; OCR is excluded                       | Later with scanned-PDF limitation                        |
| Metadata view/removal                 | Basic fields are feasible; hidden data needs output verification | Later with tests                                         |
| Watermark, numbering, headers/footers | Feasible as new page content                                     | Later                                                    |
| Password-protect output               | Current stack does not provide required assurance                | Add an audited local engine or exclude                   |
| Unlock and resave encrypted PDFs      | Reliable decrypted rewriting is not covered by current stack     | Research before commitment                               |
| True redaction                        | An overlay is unsafe; content can remain recoverable             | Exclude until recovery tests prove removal/rasterization |
| Flatten forms/annotations             | Basic AcroForms may work; XFA/signatures/appearances vary        | Limited only after fixture tests                         |
| Strong compression                    | Needs codecs and heuristics beyond current stack                 | Excluded initially                                       |
| Office conversions                    | High fidelity is not reliable fully in-browser                   | Excluded                                                 |

Warn that nearly any mutation invalidates digital signatures. Linearization, tagged accessibility structure, complex forms, attachments, JavaScript actions, and uncommon color spaces may not survive every rewrite. Never promise preservation without fixture evidence.

## 10. Privacy threat model

### Protected assets

Document bytes, filenames, extracted text, metadata, passwords, thumbnails, rendered canvases, output files, operation history, and document-derived errors.

### Trust boundaries

- Trusted for document data: current same-origin tab, dedicated workers, browser-managed temporary memory/storage.
- Not trusted for document data: hosting server, analytics, monitoring, CDNs, third-party scripts, other origins, and application logs.

### Threats and controls

| Threat                                   | Control                                                                     |
| ---------------------------------------- | --------------------------------------------------------------------------- |
| Accidental upload or telemetry capture   | No upload API; network-deny tests; CSP; allowlisted monitoring schema       |
| Filename/text/password leakage           | Sanitized error codes; never log file objects or raw document errors        |
| XSS reading in-memory files              | Strict CSP, React escaping, no unsafe HTML, dependency review               |
| Stale object URLs or IndexedDB data      | Central lifecycle manager, expiry manifest, startup/route cleanup tests     |
| Malicious PDFs causing denial of service | Limits, worker isolation, timeouts, cancellation, bounded rendering         |
| Decompression or ZIP amplification       | Entry, page, and expanded-size limits with progressive abort                |
| Unsafe download names                    | Normalize Unicode; remove paths/control characters; force safe extensions   |
| Password retention                       | Keep only in local operation scope; never persist/log; release on exit      |
| Service worker caching private data      | Explicit app-shell allowlist; deny document/blob/generated-response caching |
| Supply-chain compromise                  | Lockfile, minimal packages, audits, pinned PDF.js worker, reproducible CI   |
| Misleading privacy language              | E2E network inspection and claims reviewed against actual behavior          |

The browser, OS, installed extensions, and chosen download location are outside PDFForge's control and must be stated honestly in the privacy policy.

## 11. MVP scope

MVP includes:

- Responsive homepage, tools directory, privacy/about pages, shared tool shell, and accessible feedback states.
- Local intake, validation, cleanup, downloads, worker protocol, viewer, thumbnails, zoom, and page selection.
- Production-ready Merge PDF.
- Split PDF, Organize PDF, Images to PDF, and PDF to Images after Merge is stable.
- Cross-browser tests, network privacy tests, dependency review, CSP/security headers, and release documentation.

Not MVP: advanced editing, passwords, unlock, redaction, form flattening, PWA/offline mode, OCR, Office conversion, strong compression, accounts, cloud storage, collaboration, AI, or unreviewed analytics.

## 12. Technical risks

1. **Memory amplification:** parsing, canvases, copied buffers, and ZIP creation can exceed mobile memory. Use transferables, virtualization, concurrency limits, adaptive previews, and warnings.
2. **PDF fidelity:** rewrites can alter forms, signatures, annotations, tags, and unusual resources. Maintain a representative fixture matrix.
3. **Worker packaging:** PDF.js and worker versions must match. Copy and verify the exact pinned asset in CI.
4. **Cancellation granularity:** some library calls cannot be interrupted. Describe semantics and terminate isolated workers only when safe.
5. **Security overclaiming:** current libraries do not justify strong encryption or redaction claims. Require research and destructive recovery tests.
6. **Safari/mobile variance:** memory and performance APIs vary. Use feature detection and conservative fallbacks.
7. **Prototype coverage:** several routes/states are absent. Extend the design language only with review.
8. **Toolchain health:** npm reports an unapproved optional `unrs-resolver` postinstall. Current lint, tests, and builds pass; review future install-script requests rather than enabling them broadly.
9. **Future privacy regressions:** service workers, monitoring, and third-party assets require strict allowlists and network tests.

## 13. Phase-by-phase execution plan

| Phase | Outcome                                                 | Exit gate                                                       |
| ----: | ------------------------------------------------------- | --------------------------------------------------------------- |
|     0 | Repository, design, architecture, privacy, scope, risks | Documentation reviewed and approved                             |
|     1 | Next/TS/Tailwind foundation, tests, CI, structure       | Lint, types, tests, build pass; no auth/database                |
|     2 | PDFForge static UI and design system                    | Desktop/mobile visual review; keyboard and accessibility checks |
|     3 | Shared local file pipeline                              | Validation/naming tests; cleanup; no document network traffic   |
|     4 | PDF.js viewer and thumbnails                            | Large/mixed fixtures; lazy render and cleanup verified          |
|     5 | Typed processing-worker infrastructure                  | Responsive UI, progress/error/cancel, worker cleanup            |
|     6 | Merge PDF                                               | Ordering, output, privacy, unit, and E2E tests pass             |
|     7 | Split and Organize                                      | Range/reorder/rotation/delete/ZIP tests pass                    |
|     8 | Image conversions                                       | Orientation/transparency/quality/memory fixtures pass           |
|     9 | Supported editing/privacy tools                         | Preview and output verification per tool                        |
|    10 | Researched security tools only                          | Security claims proven by dedicated recovery tests              |
|    11 | Performance and PWA                                     | Targets met; cache allowlist and offline tests pass             |
|    12 | Privacy/security audit                                  | Network, CSP, storage, logging, dependencies cleared            |
|    13 | SEO for completed tools                                 | Unique metadata, valid structured data, accurate sitemap        |
|    14 | Cross-browser release                                   | Full suite, staging acceptance, production/rollback runbooks    |

Each phase stops for approval. Unfinished tools remain absent from public navigation, metadata, sitemap, and structured data.

## 14. Phase 1 outcome and Phase 2 prerequisites

Phase 1 delivered the `src` structure, metadata/favicon support, environment validation, `cn()`, privacy-safe error boundaries, formatting, Vitest, Playwright, and GitHub Actions CI. Lint, type checking, unit tests, production build, and Chromium/Firefox/WebKit smoke tests pass.

Before Phase 2:

1. Approve Phase 2 explicitly.
2. Use PDFForge for every public label while retaining the Figma layout language.
3. Resolve visual states not represented in the seven-frame prototype during design-system implementation.
4. Select the eventual deployment target before later security headers are finalized; this does not authorize deployment.

No PDF processing, upload behavior, authentication, database, or deployment was added in Phase 1.

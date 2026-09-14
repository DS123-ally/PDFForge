# PDFForge privacy and security audit

Date: 14 September 2026  
Phase: 12

This document records the privacy and security review against the Phase 0 threat model. Claims below match the current codebase.

## 1. Document bytes never leave the browser

- Tools read `File` / `ArrayBuffer` objects in the tab and transfer buffers into a same-origin module worker.
- There is no upload API, authentication, database, or analytics SDK.
- End-to-end tests fail if a `POST` request occurs or if request bodies contain `%PDF` during local tools.

Residual risk: a malicious browser extension, corporate TLS interceptor, or the user’s own download folder can still observe files the user opens or saves. That is outside the application trust boundary.

## 2. Network requests

Allowed in production:

- Same-origin navigations and static assets (`/_next/static`, icons, manifest, service worker).
- No third-party scripts, fonts, or CDNs on the document-processing path.

Blocked by Content-Security-Policy `default-src 'self'` plus explicit `connect-src 'self'` (development also allows `ws:` / `wss:` for HMR).

## 3. Security headers

Every route receives:

- Content-Security-Policy (no third-party script/connect; `worker-src 'self' blob:` for PDF.js and the PDF worker)
- Referrer-Policy: `no-referrer`
- X-Content-Type-Options: `nosniff`
- X-Frame-Options: `DENY`
- Permissions-Policy disabling camera, microphone, geolocation, payment, USB, and topics
- Cross-Origin-Resource-Policy: `same-origin`

`unsafe-inline` remains for Next.js hydration scripts. `unsafe-eval` is development-only. `upgrade-insecure-requests` is omitted so local HTTP and Safari/WebKit Playwright keep loading scripts; production HTTPS should set HSTS at the host.

## 4. Third-party packages

Production runtime dependencies and reasons:

| Package                      | Reason                                          |
| ---------------------------- | ----------------------------------------------- |
| `next`, `react`, `react-dom` | Application framework                           |
| `pdfjs-dist`                 | Local rendering, text extraction, raster export |
| `pdf-lib`, `pdf-lib-encrypt` | Local PDF mutation, AES-256 protect/unlock      |
| `jszip`                      | Local ZIP downloads                             |
| `lucide-react`               | Icons                                           |
| `clsx`, `tailwind-merge`     | Class composition                               |

No analytics, ads, auth, ORM, or error-monitoring packages are present. `npm audit` reported 0 vulnerabilities at the time of this review. CI runs `npm audit --audit-level=high` on every pull request.

## 5. Logging and error handling

- Error UI does not print `error.message` (which could include filenames).
- Worker errors use coded messages, not raw library dumps.
- Passwords exist only in the current operation; password tools terminate the worker after the job.

## 6. IndexedDB, cache, and service worker

- IndexedDB is not opened by application code.
- Object URLs are tracked and revoked on file removal, unmount, page hide (except back-forward cache), and before unload.
- Service worker cache `pdfforge-shell-v3` stores the public shell and hashed static assets. PDF, ZIP, blob, POST, and password query requests are excluded.

## 7. Threat-model follow-up

| Threat                              | Status                                                       |
| ----------------------------------- | ------------------------------------------------------------ |
| Accidental upload or telemetry      | Mitigated: no upload API, CSP, e2e network assertions        |
| Filename/text/password leakage      | Mitigated: no content logging; sanitized download names      |
| XSS reading in-memory files         | Mitigated: React escaping, CSP, no `dangerouslySetInnerHTML` |
| Stale object URLs                   | Mitigated: registry plus pagehide cleanup                    |
| Service worker caching private data | Mitigated: allowlist and sensitive-type deny                 |
| Supply-chain compromise             | Mitigated: lockfile, audit job, no extra runtime CDNs        |
| Host access logs                    | Accepted residual: hosts see page URLs, not documents        |

## 8. Honest limitations

- CSP still allows `'unsafe-inline'` scripts because Next.js injects inline bootstrapping.
- First-party hosting access logs can record that `/tools/merge-pdf` was requested, not the PDF contents.
- Browser extensions can read page memory.
- WebKit Playwright cannot reliably emulate offline service-worker reloads on Windows; Chromium and Firefox cover that path.

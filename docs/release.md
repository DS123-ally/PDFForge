# PDFForge production and rollback runbook

Phase 14. Host the application as a Next.js Node server. Document processing still happens in the user’s browser. Do not add upload APIs, accounts, databases, analytics, or CDNs.

## Runtime

- Node.js 24 (see `.nvmrc`). Development tooling also accepts Node `>=22.13.0` because of `pdfjs-dist`.
- npm with the committed `package-lock.json`.
- `NEXT_PUBLIC_SITE_URL` must be the public origin, for example `https://example.com`. Canonical URLs, Open Graph tags, sitemap, and robots depend on it.

CSP nonces are applied in `src/proxy.ts`. Static HTML export is not supported.

## Build and start

```bash
npm ci
npm run lint
npm run typecheck
npm run test:unit
npm run audit
npm run build
npm start -- --hostname 0.0.0.0 --port 3000
```

`npm start` runs `next start`. Playwright (`npm run test:e2e`) needs a current production build. It serves `npm start` on port 3100.

## Host configuration

The app already sends CSP, `no-referrer`, `nosniff`, `X-Frame-Options: DENY`, and Permissions-Policy.

On HTTPS, set HSTS at the reverse proxy or platform (not in local HTTP):

```
Strict-Transport-Security: max-age=63072000; includeSubDomains
```

Do not add `upgrade-insecure-requests` to CSP for mixed HTTP/Safari test hosts. Production should be HTTPS-only at the edge.

Do not log request bodies, query strings that might include filenames, or error text that includes document content. Access logs will still record public paths such as `/tools/merge-pdf`.

`/sw.js` must remain `no-cache`. A cached service worker can pin users to a broken shell.

## Staging then production

1. Deploy a staging origin with `NEXT_PUBLIC_SITE_URL` set to that origin.
2. Complete [`docs/acceptance.md`](acceptance.md).
3. Deploy the same git revision to production with the production origin.
4. Recheck canonical tags, sitemap, and HTTPS headers against the production origin.

## Rollback

1. Redeploy the previous known-good git revision (or the previous container/image).
2. Confirm `NEXT_PUBLIC_SITE_URL` still matches the public origin.
3. Confirm `/sw.js` is not cached at the CDN. The worker cache name is `pdfforge-shell-v4`; a rollback that keeps that name will reuse the old shell cache, which is acceptable if the previous revision used the same assets.
4. If a release shipped a broken worker, bump `CACHE_VERSION` in `public/sw.js` on a follow-up fix so clients drop the bad cache, then deploy that fix rather than rolling back to a worker that cannot recover.
5. Ask users stuck on a broken install to unregister the site’s service worker or use a private window.

## Do not enable

- File upload endpoints
- Document or password logging
- Third-party fonts, analytics, or error SDKs without an allowlist
- Framing, wild-card CORS, or `unsafe-inline` scripts

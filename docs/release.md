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

## VPS deploy (Docker + nginx)

PDF work stays in the visitor’s tab. The VPS only serves HTML, hashed `/_next/static` files, `/ocr` WASM/lang data, and `/sw.js`. Scale with nginx cache and Node replicas, not a PDF worker pool or upload API.

### DNS and TLS

1. Point the domain A/AAAA records at the VPS.
2. Set `NEXT_PUBLIC_SITE_URL=https://your-domain` before `docker compose build` so canonical URLs bake the public origin.
3. Obtain certificates (Let’s Encrypt / certbot on the host, or a sidecar). Place `fullchain.pem` and `privkey.pem` in `deploy/certs/` (gitignored). See `deploy/certs/README.md`.
4. Production nginx is HTTPS-only at the edge: HTTP redirects to HTTPS and sends `Strict-Transport-Security: max-age=63072000; includeSubDomains`.
5. Caddy is an acceptable substitute if you prefer automatic TLS; keep the same cache and `/sw.js` rules (`no-store` / `no-cache`). Stock `nginx:alpine` ships gzip, not brotli. Add brotli only with a custom nginx build.

### Staging vs production Compose

From the `pdfforge` directory (this folder must contain `docker-compose.yml`):

```bash
# Staging / HTTP on the VPS (or a local smoke test)
export NEXT_PUBLIC_SITE_URL=https://staging.example.com
docker compose build
docker compose up -d

# Production TLS overlay (ports 80 + 443)
export NEXT_PUBLIC_SITE_URL=https://example.com
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

`docker-compose.yml` runs two Node replicas (`app`, `app2`) behind nginx on port 80, each limited to 512 MB RAM and 1 CPU. Only `app` **builds** `pdfforge:local` (`pull_policy: build`); `app2` reuses that tag (`pull_policy: never`) so Compose does not pull a Hub repo named `pdfforge` and does not run two `npm ci` builds at once. Host port **8080** is also published for machines where port 80 is already taken. `docker-compose.prod.yml` swaps in `deploy/nginx/conf.d/https.conf` and mounts `deploy/certs` (HTTPS on 443, and 8443 when 443 is busy).

The first build still needs Docker Hub for `node:24-alpine`. If you see `lookup registry-1.docker.io: no such host`, Docker Desktop cannot resolve the registry (VPN, DNS, or a brief outage). Fix host DNS, then:

```bash
docker pull node:24-alpine
docker compose up -d --build
```

Healthchecks call `GET /health` (JSON `{ ok: true }`, `no-store`, `noindex`). There is no document logic on that route.

### How to scale

- Cache `/_next/static/` and `/ocr/` at nginx (immutable Cache-Control plus on-disk `proxy_cache`).
- Add a second VPS or region only for latency, not PDF throughput.
- Keep HTML at `max-age=0, must-revalidate`. Do not put `pdf.worker` or Tesseract on a third-party CDN (breaks CSP and the privacy model).
- Rate limits: HTML 10 r/s per IP (burst 20); static assets are looser. `client_max_body_size` is small because there is no upload API.

### What to watch

- nginx 5xx rate and active connections
- disk used by `/tmp/nginx-cache` and the host
- Node RSS (compose `mem_limit` should kill a runaway process before the host OOMs)

Never log filenames, query strings, request bodies, or PDF bytes. The bundled access log format uses `$uri` only.

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

1. Redeploy the previous known-good git revision (or `docker tag` / run the previous `pdfforge` image). Rolling restarts: bring up a replica on the new image, then replace the other.
2. Confirm `NEXT_PUBLIC_SITE_URL` still matches the public origin.
3. Confirm `/sw.js` is not cached (nginx `no-store` / `no-cache`; do not put the worker on a CDN). The worker cache name is `pdfforge-shell-v4`; a rollback that keeps that name will reuse the old shell cache, which is acceptable if the previous revision used the same assets.
4. If a release shipped a broken worker, bump `CACHE_VERSION` in `public/sw.js` on a follow-up fix so clients drop the bad cache, then deploy that fix rather than rolling back to a worker that cannot recover.
5. Ask users stuck on a broken install to unregister the site’s service worker or use a private window.

## Do not enable

- File upload endpoints
- Document or password logging
- Third-party fonts, analytics, or error SDKs without an allowlist
- Framing, wild-card CORS, or `unsafe-inline` scripts

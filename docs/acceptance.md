# Staging acceptance checklist

Run this on a staging origin that uses HTTPS and a production `next start` (or equivalent) build. Mark each item only after a human or automated check.

## Browsers

- Chromium (current Chrome or Edge), desktop and a ~375px phone width
- Firefox, desktop
- WebKit / Safari, desktop (iOS Safari if a device is available)

Automated coverage: Playwright projects `chromium`, `firefox`, and `webkit`. WebKit offline service-worker reload is skipped on Windows; Chromium and Firefox cover that path.

## Smoke

- Home loads, no horizontal overflow at 375px, mobile menu opens from the keyboard
- All tools directory search and category hash filters
- Merge PDF: add two files, merge, download, no document POST
- Split PDF range ZIP and Organize PDF save
- Images to PDF and PDF to Images
- Rotate PDF, Remove Metadata, View Metadata, Extract Text
- Password Protect / Unlock, Redact, Flatten
- `/privacy` and `/about` match actual local processing
- `/tools/merge-pdf` shows the working tool above FAQs; title is unique
- `/workspace#merge-pdf` is `noindex`
- `/sitemap.xml` lists completed tools only
- `/robots.txt` disallows `/workspace` and `/offline`
- Production service worker registers and does not cache `application/pdf`

## Privacy and headers

- Response includes Content-Security-Policy with a nonce and `connect-src 'self'`
- No document IndexedDB or localStorage keys after a merge
- Staging logs do not contain filenames, PDF bytes, or passwords

## Sign-off

Staging origin:  
Git revision:  
Date:  
Accepted by:

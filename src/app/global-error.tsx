"use client";

import { sans } from "./fonts";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ reset }: GlobalErrorProps) {
  return (
    <html className={sans.variable} lang="en">
      <body className={sans.className}>
        <main
          style={{
            alignItems: "center",
            display: "flex",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "1.5rem",
          }}
        >
          <section aria-labelledby="global-error-title">
            <h1 id="global-error-title">PDFForge could not load</h1>
            <p>No document data was sent anywhere.</p>
            <button type="button" onClick={reset}>
              Reload PDFForge
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}

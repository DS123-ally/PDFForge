"use client";

import "@fontsource/inter/400.css";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ reset }: GlobalErrorProps) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "Inter, Segoe UI, Arial, sans-serif" }}>
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

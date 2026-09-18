export function GET() {
  return Response.json(
    { ok: true, service: "pdfforge" },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    },
  );
}

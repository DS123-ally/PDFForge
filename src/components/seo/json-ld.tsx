import { serializeJsonLd } from "@/lib/seo/json-ld";

export function JsonLd({ data, nonce }: { data: unknown; nonce?: string }) {
  return (
    <script
      nonce={nonce}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}

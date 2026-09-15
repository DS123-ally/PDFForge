import type { ToolDefinition } from "@/config/tools";
import type { ToolSeoContent } from "@/config/tool-seo";

export function serializeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function buildToolJsonLd({
  canonical,
  seo,
  tool,
}: {
  canonical: string;
  seo: ToolSeoContent;
  tool: ToolDefinition;
}) {
  const origin = new URL(canonical).origin;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: `PDFForge ${tool.title}`,
        url: canonical,
        applicationCategory: "UtilitiesApplication",
        operatingSystem: "Any",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
        description: seo.metaDescription,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: origin,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "All tools",
            item: `${origin}/tools`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: tool.title,
            item: canonical,
          },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: seo.faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.answer,
          },
        })),
      },
    ],
  };
}

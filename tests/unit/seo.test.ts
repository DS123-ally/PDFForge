import { describe, expect, it } from "vitest";

import { indexablePaths } from "@/config/site";
import { tools } from "@/config/tools";
import {
  assertToolSeoCoverage,
  getRelatedTools,
  getToolSeo,
  toolSeo,
} from "@/config/tool-seo";
import { getToolHref, getWorkspaceHref } from "@/lib/privacy/tool-location";
import { buildToolJsonLd, serializeJsonLd } from "@/lib/seo/json-ld";

describe("tool SEO coverage", () => {
  it("covers every completed tool with unique copy", () => {
    expect(assertToolSeoCoverage()).toBe(true);

    const titles = toolSeo.map((entry) => entry.pageTitle);
    const descriptions = toolSeo.map((entry) => entry.metaDescription);

    expect(new Set(titles).size).toBe(titles.length);
    expect(new Set(descriptions).size).toBe(descriptions.length);
    expect(titles).toHaveLength(tools.length);
  });

  it("keeps related tools on completed public slugs", () => {
    for (const entry of toolSeo) {
      expect(entry.faqs.length).toBeGreaterThanOrEqual(3);
      expect(entry.steps.length).toBeGreaterThanOrEqual(3);
      expect(getRelatedTools(entry.slug).length).toBeGreaterThan(0);
    }
  });
});

describe("indexable routes", () => {
  it("includes public pages and completed tools only", () => {
    expect(indexablePaths).toContain("/");
    expect(indexablePaths).toContain("/tools");
    expect(indexablePaths).toContain("/privacy");
    expect(indexablePaths).toContain("/about");
    expect(indexablePaths).not.toContain("/workspace");
    expect(indexablePaths).not.toContain("/offline");
    expect(indexablePaths).not.toContain("/tools/merge-pdf/states");

    for (const tool of tools) {
      expect(indexablePaths).toContain(`/tools/${tool.slug}`);
    }
  });
});

describe("structured data", () => {
  it("serializes FAQ and breadcrumb JSON-LD without raw script tags", () => {
    const tool = tools.find((entry) => entry.slug === "merge-pdf");
    const seo = getToolSeo("merge-pdf");

    expect(tool).toBeDefined();
    expect(seo).toBeDefined();
    if (!tool || !seo) {
      return;
    }

    const jsonLd = buildToolJsonLd({
      canonical: "http://localhost:3000/tools/merge-pdf",
      seo,
      tool,
    });
    const serialized = serializeJsonLd(jsonLd);

    expect(serialized).toContain("FAQPage");
    expect(serialized).toContain("BreadcrumbList");
    expect(serialized).toContain("WebApplication");
    expect(serializeJsonLd({ html: "</script>" })).toContain("\\u003c/script>");
    expect(getToolHref("merge-pdf")).toBe("/tools/merge-pdf");
    expect(getWorkspaceHref("merge-pdf")).toBe("/workspace#merge-pdf");
  });
});

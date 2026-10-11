import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { IndustryLanding } from "@/components/industry/industry-page";
import { getIndustry, industries } from "@/config/industries";
import { absoluteUrl, noIndex } from "@/config/site";
import { getRecipePreset } from "@/lib/recipes/recipe";

type IndustryRouteProps = {
  params: Promise<{ audience: string }>;
};

export function generateStaticParams() {
  return industries.map((page) => ({ audience: page.slug }));
}

export async function generateMetadata({
  params,
}: IndustryRouteProps): Promise<Metadata> {
  const { audience } = await params;
  const page = getIndustry(audience);

  if (!page) {
    return { robots: noIndex };
  }

  const url = absoluteUrl(`/for/${page.slug}`);

  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: url },
    openGraph: {
      title: page.title,
      description: page.description,
      url,
      siteName: "PDFForge",
      type: "website",
    },
  };
}

export default async function IndustryRoute({ params }: IndustryRouteProps) {
  const { audience } = await params;
  const page = getIndustry(audience);

  if (
    !page ||
    !getRecipePreset(page.presetId) ||
    !getRecipePreset(page.matchingPresetId)
  ) {
    notFound();
  }

  return <IndustryLanding page={page} />;
}

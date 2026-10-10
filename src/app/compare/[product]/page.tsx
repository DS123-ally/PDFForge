import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { UploadComparisonPage } from "@/components/compare/upload-comparison";
import { comparisons, getComparison } from "@/config/comparisons";
import { absoluteUrl, noIndex } from "@/config/site";

type ComparePageProps = {
  params: Promise<{ product: string }>;
};

export function generateStaticParams() {
  return comparisons.map((page) => ({ product: page.slug }));
}

export async function generateMetadata({
  params,
}: ComparePageProps): Promise<Metadata> {
  const { product } = await params;
  const page = getComparison(product);

  if (!page) {
    return { robots: noIndex };
  }

  const url = absoluteUrl(`/compare/${page.slug}`);

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

export default async function ComparePage({ params }: ComparePageProps) {
  const { product } = await params;
  const page = getComparison(product);

  if (!page) {
    notFound();
  }

  return <UploadComparisonPage page={page} />;
}

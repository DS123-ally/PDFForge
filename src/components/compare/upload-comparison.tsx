import Link from "next/link";

import { PageShell } from "@/components/layout/page-shell";
import { buttonStyles } from "@/components/ui/button";
import {
  comparisons,
  pdfForgeProcessing,
  type UploadComparison,
} from "@/config/comparisons";

export function UploadComparisonPage({ page }: { page: UploadComparison }) {
  const others = comparisons.filter((entry) => entry.slug !== page.slug);

  return (
    <PageShell>
      <main className="px-5 py-14 sm:px-8 sm:py-20" id="main-content">
        <article className="mx-auto w-full max-w-5xl min-w-0">
          <p className="text-sm font-bold tracking-wide text-red-600 uppercase">
            Comparison
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-balance sm:text-5xl">
            {page.title}
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-zinc-600">
            {page.intro}
          </p>
          <div className="mt-10 max-w-full overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
            <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
              <caption className="sr-only">
                What {page.product} uploads compared with PDFForge
              </caption>
              <thead className="bg-zinc-50 text-zinc-950">
                <tr>
                  <th className="px-4 py-3 font-bold" scope="col">
                    What
                  </th>
                  <th className="px-4 py-3 font-bold" scope="col">
                    {page.product}
                  </th>
                  <th className="px-4 py-3 font-bold" scope="col">
                    PDFForge
                  </th>
                </tr>
              </thead>
              <tbody>
                {page.rows.map((row) => (
                  <tr className="border-t border-zinc-200" key={row.item}>
                    <th
                      className="px-4 py-4 align-top font-semibold"
                      scope="row"
                    >
                      {row.item}
                    </th>
                    <td className="px-4 py-4 align-top leading-6 text-zinc-700">
                      {row.uploads}
                    </td>
                    <td className="px-4 py-4 align-top font-semibold text-emerald-800">
                      {pdfForgeProcessing}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-6 max-w-3xl text-sm leading-6 text-zinc-600">
            {page.note} Checked {page.checked}. These pages can change.
          </p>
          <section className="mt-10">
            <h2 className="text-2xl font-bold text-zinc-950">Sources</h2>
            <ul className="mt-4 list-disc space-y-2 pl-6 text-zinc-700">
              {page.sources.map((source) => (
                <li key={source.href}>
                  <a
                    className="font-semibold text-red-700 underline decoration-red-200 underline-offset-4 hover:text-red-800"
                    href={source.href}
                    rel="noreferrer"
                  >
                    {source.label}
                  </a>
                </li>
              ))}
            </ul>
          </section>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link className={buttonStyles()} href="/tools">
              Browse local tools
            </Link>
            {others.map((other) => (
              <Link
                className={buttonStyles("secondary")}
                href={`/compare/${other.slug}`}
                key={other.slug}
              >
                vs {other.product}
              </Link>
            ))}
          </div>
        </article>
      </main>
    </PageShell>
  );
}

import type { ReactNode } from "react";

import { PageShell } from "@/components/layout/page-shell";

type ContentPageProps = {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
};

export function ContentPage({
  eyebrow,
  title,
  intro,
  children,
}: ContentPageProps) {
  return (
    <PageShell>
      <main className="px-5 py-14 sm:px-8 sm:py-20" id="main-content">
        <article className="mx-auto max-w-3xl">
          <p className="text-sm font-bold tracking-wide text-red-600 uppercase">
            {eyebrow}
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-balance sm:text-5xl">
            {title}
          </h1>
          <p className="mt-5 text-lg leading-8 text-zinc-600">{intro}</p>
          <div className="mt-10 space-y-10 text-base leading-7 text-zinc-700">
            {children}
          </div>
        </article>
      </main>
    </PageShell>
  );
}

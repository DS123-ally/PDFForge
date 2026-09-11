import Link from "next/link";

import { PageShell } from "@/components/layout/page-shell";
import { buttonStyles } from "@/components/ui/button";

export default function NotFound() {
  return (
    <PageShell>
      <main
        className="grid min-h-[65vh] place-items-center px-5 py-16 text-center"
        id="main-content"
      >
        <div>
          <p className="text-sm font-bold tracking-widest text-red-600 uppercase">
            404 error
          </p>
          <h1 className="mt-4 text-5xl font-black tracking-tight">
            That page is missing
          </h1>
          <p className="mx-auto mt-4 max-w-lg leading-7 text-zinc-600">
            The page may have moved, or the tool may not be available yet.
          </p>
          <Link className={`${buttonStyles()} mt-7`} href="/">
            Return home
          </Link>
        </div>
      </main>
    </PageShell>
  );
}

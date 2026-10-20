import type { ReactNode } from "react";

export function SectionHeading({
  align = "center",
  children,
  eyebrow,
  id,
  title,
}: {
  align?: "center" | "start";
  children: ReactNode;
  eyebrow: string;
  id: string;
  title: string;
}) {
  const centered = align === "center";

  return (
    <div className={centered ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <span className="border-border/80 inline-flex items-center rounded-full border bg-white px-3 py-1 text-xs font-semibold tracking-wider text-zinc-700 uppercase shadow-2xs">
        {eyebrow}
      </span>
      <h2
        className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-balance text-zinc-950 sm:text-4xl sm:leading-tight md:text-5xl"
        id={id}
      >
        {title}
      </h2>
      <p className="mt-3 text-sm leading-6 text-zinc-600 sm:text-base">
        {children}
      </p>
    </div>
  );
}

import { CircleAlert } from "lucide-react";

type ErrorStateProps = {
  title: string;
  description: string;
};

export function ErrorState({ title, description }: ErrorStateProps) {
  return (
    <section
      className="rounded-2xl border border-red-200 bg-red-50 p-6"
      role="alert"
    >
      <CircleAlert aria-hidden="true" className="size-6 text-red-600" />
      <h2 className="mt-3 font-bold">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-zinc-700">{description}</p>
    </section>
  );
}

"use client";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ reset }: ErrorPageProps) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <section
        className="max-w-lg rounded-2xl border border-zinc-200 p-8 text-center"
        aria-labelledby="error-title"
      >
        <h1 id="error-title" className="text-2xl font-bold">
          Something went wrong
        </h1>
        <p className="mt-3 text-zinc-600">
          Your files have not been uploaded. Try this step again.
        </p>
        <button
          type="button"
          className="mt-6 min-h-11 rounded-lg bg-red-600 px-5 py-2 font-semibold text-white focus-visible:outline-2 focus-visible:outline-red-700"
          onClick={reset}
        >
          Try again
        </button>
      </section>
    </main>
  );
}

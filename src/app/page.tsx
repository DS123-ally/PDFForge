export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 text-zinc-950">
      <section className="w-full max-w-2xl rounded-3xl border border-zinc-200 p-8 shadow-sm sm:p-12">
        <p className="mb-3 text-sm font-bold tracking-widest text-red-600 uppercase">
          Private · Local · Free
        </p>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          PDFForge
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-8 text-zinc-600">
          The application foundation is ready. PDF tools will be added one
          approved phase at a time and will process documents locally in your
          browser.
        </p>
      </section>
    </main>
  );
}

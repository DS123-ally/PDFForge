import type { RecipeIntegrityTrail } from "@/lib/recipes/recipe-integrity";

export function RecipeIntegrityTrailNotice({
  trail,
}: {
  trail: RecipeIntegrityTrail;
}) {
  return (
    <div className="mt-5 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-left">
      <h3 className="text-sm font-black text-zinc-950">
        Recipe integrity trail
      </h3>
      <p className="mt-2 text-sm leading-6 text-zinc-600">
        SHA-256 hashes were recorded locally before and after the recipe run.
      </p>
      <dl className="mt-3 space-y-3 text-xs">
        {trail.before.map((entry, index) => (
          <div key={`${entry.name}-${entry.hash}`}>
            <dt className="font-bold text-zinc-700">
              Before {trail.before.length > 1 ? index + 1 : ""}
              {entry.name ? ` - ${entry.name}` : ""}
            </dt>
            <dd className="mt-1 font-mono break-all text-zinc-950">
              {entry.hash}
            </dd>
          </div>
        ))}
        <div>
          <dt className="font-bold text-zinc-700">
            After - {trail.after.name}
          </dt>
          <dd className="mt-1 font-mono break-all text-zinc-950">
            {trail.after.hash}
          </dd>
        </div>
      </dl>
    </div>
  );
}

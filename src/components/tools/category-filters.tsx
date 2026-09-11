import type { ToolCategory } from "@/config/tools";
import { toolCategories } from "@/config/tools";
import { cn } from "@/lib/utils";

type Category = "All" | ToolCategory;

type CategoryFiltersProps = {
  active: Category;
  onChange: (category: Category) => void;
};

export function CategoryFilters({ active, onChange }: CategoryFiltersProps) {
  return (
    <div
      aria-label="Tool categories"
      className="flex flex-wrap gap-2"
      role="group"
    >
      {toolCategories.map((category) => (
        <button
          aria-pressed={active === category}
          className={cn(
            "min-h-11 rounded-full border px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-red-600",
            active === category
              ? "border-red-600 bg-red-600 text-white"
              : "border-zinc-300 bg-white hover:border-red-300 hover:text-red-700",
          )}
          key={category}
          onClick={() => onChange(category)}
          type="button"
        >
          {category}
        </button>
      ))}
    </div>
  );
}

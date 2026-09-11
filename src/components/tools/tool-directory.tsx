"use client";

import { useMemo, useState } from "react";

import { CategoryFilters } from "@/components/tools/category-filters";
import { SearchInput } from "@/components/tools/search-input";
import { ToolCard } from "@/components/tools/tool-card";
import { EmptyState } from "@/components/ui/empty-state";
import { toolCategories, tools, type ToolCategory } from "@/config/tools";

type Category = "All" | ToolCategory;

export function ToolDirectory({
  initialCategory = "All",
}: {
  initialCategory?: string;
}) {
  const safeCategory = toolCategories.includes(initialCategory as Category)
    ? (initialCategory as Category)
    : "All";
  const [category, setCategory] = useState<Category>(safeCategory);
  const [query, setQuery] = useState("");

  const filteredTools = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();

    return tools.filter((tool) => {
      const categoryMatches = category === "All" || tool.category === category;
      const searchMatches =
        !normalized ||
        `${tool.title} ${tool.shortDescription} ${tool.category}`
          .toLocaleLowerCase()
          .includes(normalized);

      return categoryMatches && searchMatches;
    });
  }, [category, query]);

  return (
    <div>
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <SearchInput
          onChange={(event) => setQuery(event.target.value)}
          value={query}
        />
        <CategoryFilters active={category} onChange={setCategory} />
      </div>
      {filteredTools.length ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {filteredTools.map((tool) => (
            <ToolCard key={tool.slug} tool={tool} />
          ))}
        </div>
      ) : (
        <div className="mt-8">
          <EmptyState
            description="Try another search or choose a different category."
            title="No tools match"
          />
        </div>
      )}
    </div>
  );
}

import Link from "next/link";

import { ToolCard } from "@/components/tools/tool-card";
import { directoryGroups, type ToolDefinition } from "@/config/tools";
import { getToolsCategoryHref } from "@/lib/privacy/tool-location";

export function ToolGroups({
  headingLevel = "h2",
  linkHeadings = false,
  tools,
}: {
  headingLevel?: "h2" | "h3";
  linkHeadings?: boolean;
  tools: readonly ToolDefinition[];
}) {
  const Heading = headingLevel;

  return (
    <div className="space-y-12">
      {directoryGroups.map((category) => {
        const group = tools.filter((tool) => tool.category === category);

        if (group.length === 0) {
          return null;
        }

        const headingId = `tools-${category}`;

        return (
          <section aria-labelledby={headingId} key={category}>
            <Heading
              className="text-xl font-black tracking-tight"
              id={headingId}
            >
              {linkHeadings ? (
                <Link
                  className="rounded-md hover:text-red-700 focus-visible:outline-2 focus-visible:outline-red-600"
                  href={getToolsCategoryHref(category)}
                >
                  {category}
                </Link>
              ) : (
                category
              )}
            </Heading>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {group.map((tool) => (
                <ToolCard key={tool.slug} tool={tool} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

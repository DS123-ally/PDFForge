import { Search } from "lucide-react";
import type { ChangeEventHandler } from "react";

type SearchInputProps = {
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
};

export function SearchInput({ value, onChange }: SearchInputProps) {
  return (
    <label className="relative block">
      <span className="sr-only">Search PDF tools</span>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-zinc-500"
      />
      <input
        className="min-h-12 w-full rounded-xl border border-zinc-300 bg-white pr-4 pl-12 text-base focus-visible:outline-2 focus-visible:outline-red-600"
        onChange={onChange}
        placeholder="Search PDF tools"
        type="search"
        value={value}
      />
    </label>
  );
}

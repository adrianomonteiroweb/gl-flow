"use client";

import { SearchInput } from "@workspace/ui/components/input-search";
import useSearchParams from "@/hooks/use-search-params";

export function SearchServerInput() {
  const { params, setParams } = useSearchParams();

  const q: string = params.get("q") || "";

  const handleSearchChange = (e: any) => {
    setParams({
      ...params.entries(),
      q: e.target.value,
      page: 1,
    });
  };

  return <SearchInput defaultValue={q} onChange={handleSearchChange} />;
}

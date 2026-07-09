"use client";

import { Search } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input, Select } from "@/shared/components/ui/input";

export type FilterOption = {
  name: string;
  label: string;
  value: string;
  options: Array<{ label: string; value: string }>;
};

export function FilterBar({
  search,
  searchPlaceholder = "Buscar…",
  filters = [],
  onSearchChange,
  onFilterChange,
  onClear,
}: Readonly<{
  search: string;
  searchPlaceholder?: string;
  filters?: FilterOption[];
  onSearchChange: (value: string) => void;
  onFilterChange?: (name: string, value: string) => void;
  onClear?: () => void;
}>) {
  return (
    <div className="mb-4 flex flex-col gap-3 rounded-lg border border-atlas-border bg-white p-3 lg:flex-row lg:items-center">
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-atlas-muted" />
        <Input
          className="pl-9"
          value={search}
          placeholder={searchPlaceholder}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>
      {filters.map((filter) => (
        <Select
          key={filter.name}
          className="lg:w-48"
          value={filter.value}
          onChange={(event) =>
            onFilterChange?.(filter.name, event.target.value)
          }
        >
          <option value="">{filter.label}</option>
          {filter.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      ))}
      {onClear ? <Button onClick={onClear}>Limpiar</Button> : null}
    </div>
  );
}

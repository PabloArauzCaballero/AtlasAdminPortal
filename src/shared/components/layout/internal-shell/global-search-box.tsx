"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Input } from "@/shared/components/ui/input";

export function GlobalSearchBox() {
  const router = useRouter();
  const [q, setQ] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = q.trim();
    if (!value) return;
    router.push(`/internal/search?q=${encodeURIComponent(value)}`);
  }

  return (
    <form className="relative w-full" onSubmit={submit}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-atlas-muted" />
      <Input
        aria-label="Buscador global"
        className="rounded-full bg-atlas-soft pl-9 focus:bg-white"
        placeholder="Buscar en el portal…"
        value={q}
        onChange={(event) => setQ(event.target.value)}
      />
    </form>
  );
}

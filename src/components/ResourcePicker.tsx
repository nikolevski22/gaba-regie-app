"use client";

import { useEffect, useRef, useState } from "react";

export interface ResourceHit {
  id: string;
  artikelNr: string;
  bezeichnung: string;
  kategorie: string;
  einheit: string;
  preis: number;
}

export function ResourcePicker({
  onPick,
  placeholder = "Artikel suchen …",
}: {
  onPick: (r: ResourceHit) => void;
  placeholder?: string;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [hits, setHits] = useState<ResourceHit[]>([]);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!q.trim()) {
      setHits([]);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/resources?q=${encodeURIComponent(q)}`);
        setHits(await res.json());
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div ref={boxRef} className="relative">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => hits.length && setOpen(true)}
        placeholder={placeholder}
        className="w-full rounded-md border px-3 py-1.5 text-sm outline-none focus:border-gaba focus:ring-1 focus:ring-gaba"
      />
      {open && (hits.length > 0 || loading) && (
        <div className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-md border bg-white shadow-lg">
          {loading && <div className="px-3 py-2 text-xs text-neutral-400">Suche …</div>}
          {hits.map((h) => (
            <button
              key={h.id + h.einheit}
              type="button"
              onClick={() => {
                onPick(h);
                setQ("");
                setHits([]);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm hover:bg-neutral-50"
            >
              <span className="truncate">
                <span className="text-neutral-400">{h.artikelNr}</span> {h.bezeichnung}
              </span>
              <span className="shrink-0 tabular-nums text-neutral-500">
                {h.einheit} · {h.preis.toFixed(2)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function kategorieToGruppe(k: string): "PERSONAL" | "MASCHINE" | "FAHRZEUG" | "MATERIAL" | "SONSTIGES" {
  switch (k) {
    case "LABOR":
      return "PERSONAL";
    case "MACHINE":
      return "MASCHINE";
    case "VEHICLE":
      return "FAHRZEUG";
    case "MATERIAL":
      return "MATERIAL";
    default:
      return "SONSTIGES";
  }
}

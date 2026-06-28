"use client";

import { useEffect, useRef, useState } from "react";
import {
  newBlankReport,
  newStandardReport,
  newReportFromTemplate,
} from "@/lib/actions/templates";

export function NewReportButton({
  templates,
}: {
  templates: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="relative flex items-center gap-2">
      <form action={newStandardReport}>
        <button className="rounded-md bg-gaba px-4 py-2 text-sm font-medium text-white hover:bg-gaba-dark">
          + Neuer Rapport
        </button>
      </form>

      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-md border px-3 py-2 text-sm hover:bg-neutral-50"
      >
        weitere ▾
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-30 w-64 overflow-hidden rounded-md border bg-white shadow-lg">
          <form action={newBlankReport}>
            <button className="block w-full px-4 py-2 text-left text-sm hover:bg-neutral-50">
              Leerer Rapport
            </button>
          </form>
          {templates.map((t) => (
            <form key={t.id} action={newReportFromTemplate.bind(null, t.id)}>
              <button className="block w-full border-t px-4 py-2 text-left text-sm hover:bg-neutral-50">
                {t.name}
              </button>
            </form>
          ))}
        </div>
      )}
    </div>
  );
}

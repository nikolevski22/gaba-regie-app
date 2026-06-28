"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const ITEMS = [
  { href: "/admin/templates", label: "Vorlagen" },
  { href: "/admin/resources", label: "Artikelkatalog" },
  { href: "/admin/employees", label: "Mitarbeiter" },
  { href: "/admin/settings", label: "Einstellungen (MwSt)" },
];

export function AdminMenu() {
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
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-neutral-50"
      >
        Admin
        <span className="text-xs">▾</span>
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1 w-56 overflow-hidden rounded-md border bg-white shadow-lg">
          {ITEMS.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm hover:bg-neutral-50"
            >
              {it.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

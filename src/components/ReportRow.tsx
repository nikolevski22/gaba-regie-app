"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { softDeleteReport, setReportStatus } from "@/lib/actions/reports";

const STATUS: { value: string; label: string; cls: string }[] = [
  { value: "ENTWURF", label: "Entwurf", cls: "bg-neutral-100 text-neutral-700" },
  { value: "GESENDET", label: "Gesendet", cls: "bg-blue-100 text-blue-700" },
  { value: "UNTERZEICHNET", label: "Unterzeichnet", cls: "bg-amber-100 text-amber-700" },
  { value: "ABGERECHNET", label: "Abgerechnet", cls: "bg-green-100 text-green-700" },
];

function StatusCell({ id, status }: { id: string; status: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  const current = STATUS.find((s) => s.value === status) ?? STATUS[0];

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={ref} className="relative inline-block" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        disabled={pending}
        onClick={() => setOpen((v) => !v)}
        className={`rounded-full px-2 py-0.5 text-xs hover:ring-1 hover:ring-neutral-300 ${current.cls}`}
        title="Status ändern"
      >
        {current.label} <span className="text-[9px]">▾</span>
      </button>
      {open && (
        <div className="absolute left-0 z-30 mt-1 w-40 overflow-hidden rounded-md border bg-white shadow-lg">
          {STATUS.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => {
                setOpen(false);
                if (s.value !== status) start(() => setReportStatus(id, s.value));
              }}
              className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-neutral-50 ${
                s.value === status ? "font-semibold" : ""
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${s.cls}`} />
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ReportRow({
  id,
  nr,
  datum,
  objektTitel,
  status,
  netto,
}: {
  id: string;
  nr: string;
  datum: string;
  objektTitel: string;
  status: string;
  netto: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <tr
      onClick={() => router.push(`/reports/${id}`)}
      className="cursor-pointer border-b last:border-0 hover:bg-neutral-50"
    >
      <td className="px-4 py-3 font-medium text-gaba">{nr}</td>
      <td className="px-4 py-3">{datum}</td>
      <td className="px-4 py-3">{objektTitel}</td>
      <td className="px-4 py-3">
        <StatusCell id={id} status={status} />
      </td>
      <td className="px-4 py-3 text-right tabular-nums">{netto}</td>
      <td className="px-2 py-3 text-right">
        <button
          type="button"
          aria-label="In den Papierkorb"
          title="In den Papierkorb"
          disabled={pending}
          onClick={(e) => {
            e.stopPropagation();
            if (confirm("Diesen Rapport in den Papierkorb verschieben?")) {
              start(() => softDeleteReport(id));
            }
          }}
          className="rounded p-1 text-neutral-400 hover:bg-red-50 hover:text-red-600"
        >
          🗑
        </button>
      </td>
    </tr>
  );
}

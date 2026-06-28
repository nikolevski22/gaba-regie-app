"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { softDeleteReport, setReportStatus } from "@/lib/actions/reports";

const STATUS: { value: string; label: string; cls: string; dot: string }[] = [
  { value: "ENTWURF", label: "Entwurf", cls: "bg-neutral-100 text-neutral-700", dot: "bg-neutral-400" },
  { value: "GESENDET", label: "Gesendet", cls: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
  { value: "UNTERZEICHNET", label: "Unterzeichnet", cls: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
  { value: "ABGERECHNET", label: "Abgerechnet", cls: "bg-green-100 text-green-700", dot: "bg-green-500" },
];

function StatusCell({ id, status }: { id: string; status: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [pending, start] = useTransition();
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const current = STATUS.find((s) => s.value === status) ?? STATUS[0];

  function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    const r = btnRef.current?.getBoundingClientRect();
    if (r) {
      const left = Math.min(r.left, window.innerWidth - 180);
      setPos({ top: r.bottom + 4, left: Math.max(8, left) });
    }
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    function close(e: MouseEvent) {
      if (
        menuRef.current?.contains(e.target as Node) ||
        btnRef.current?.contains(e.target as Node)
      )
        return;
      setOpen(false);
    }
    function onScroll() {
      setOpen(false);
    }
    document.addEventListener("mousedown", close);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  return (
    <span onClick={(e) => e.stopPropagation()}>
      <button
        ref={btnRef}
        type="button"
        disabled={pending}
        onClick={toggle}
        className={`rounded-full px-2 py-0.5 text-xs hover:ring-1 hover:ring-neutral-300 ${current.cls}`}
        title="Status ändern"
      >
        {current.label} <span className="text-[9px]">▾</span>
      </button>

      {open &&
        pos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: "fixed", top: pos.top, left: pos.left, width: 172 }}
            className="z-50 overflow-hidden rounded-md border bg-white shadow-lg"
          >
            {STATUS.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => {
                  setOpen(false);
                  if (s.value !== status) start(() => setReportStatus(id, s.value));
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-neutral-50 ${
                  s.value === status ? "font-semibold" : ""
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                {s.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </span>
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

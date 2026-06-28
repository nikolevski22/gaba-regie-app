"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { softDeleteReport } from "@/lib/actions/reports";

export function ReportRow({
  id,
  nr,
  datum,
  objektTitel,
  statusLabel,
  statusClass,
  netto,
}: {
  id: string;
  nr: string;
  datum: string;
  objektTitel: string;
  statusLabel: string;
  statusClass: string;
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
        <span className={`rounded-full px-2 py-0.5 text-xs ${statusClass}`}>
          {statusLabel}
        </span>
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

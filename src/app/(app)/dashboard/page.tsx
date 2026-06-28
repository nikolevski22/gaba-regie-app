import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatCHF } from "@/lib/calc";
import { rapportNr } from "@/lib/utils";
import { NewReportButton } from "@/components/NewReportButton";
import { ReportRow } from "@/components/ReportRow";

const STATUS_LABEL: Record<string, string> = {
  ENTWURF: "Entwurf",
  GESENDET: "Gesendet",
  UNTERZEICHNET: "Unterzeichnet",
  ABGERECHNET: "Abgerechnet",
};

const STATUS_STYLE: Record<string, string> = {
  ENTWURF: "bg-neutral-100 text-neutral-700",
  GESENDET: "bg-blue-100 text-blue-700",
  UNTERZEICHNET: "bg-amber-100 text-amber-700",
  ABGERECHNET: "bg-green-100 text-green-700",
};

export default async function DashboardPage() {
  const [reports, trashCount] = await Promise.all([
    prisma.report.findMany({
      where: { deletedAt: null },
      orderBy: { datum: "desc" },
      take: 100,
    }),
    prisma.report.count({ where: { deletedAt: { not: null } } }),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Regieberichte</h1>
        <NewReportButton />
      </div>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-neutral-50 text-left text-neutral-500">
            <tr>
              <th className="px-4 py-2">Rapport-Nr.</th>
              <th className="px-4 py-2">Datum</th>
              <th className="px-4 py-2">Objekt / Titel</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2 text-right">Netto CHF</th>
              <th className="px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {reports.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-neutral-400">
                  Noch keine Rapporte. Lege den ersten an.
                </td>
              </tr>
            )}
            {reports.map((r) => (
              <ReportRow
                key={r.id}
                id={r.id}
                nr={rapportNr(r.rapportBasis, r.rapportSuffix) || "—"}
                datum={r.datum.toLocaleDateString("de-CH")}
                objektTitel={
                  [r.objekt, r.titel].filter(Boolean).join(" · ") || "—"
                }
                statusLabel={STATUS_LABEL[r.status]}
                statusClass={STATUS_STYLE[r.status]}
                netto={formatCHF(Number(r.nettoInklMwst))}
              />
            ))}
          </tbody>
        </table>
      </div>

      {trashCount > 0 && (
        <div className="text-right text-sm">
          <Link href="/reports/trash" className="text-neutral-500 hover:text-gaba">
            🗑 Papierkorb ({trashCount})
          </Link>
        </div>
      )}
    </div>
  );
}

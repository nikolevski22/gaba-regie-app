import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatCHF } from "@/lib/calc";
import { rapportNr } from "@/lib/utils";

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
  const reports = await prisma.report.findMany({
    orderBy: { datum: "desc" },
    take: 100,
    include: { customer: true, project: true },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Regieberichte</h1>
        <Link
          href="/reports/new"
          className="rounded-md bg-gaba px-4 py-2 text-sm font-medium text-white hover:bg-gaba-dark"
        >
          + Neuer Rapport
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-neutral-50 text-left text-neutral-500">
            <tr>
              <th className="px-4 py-2">Rapport-Nr.</th>
              <th className="px-4 py-2">Datum</th>
              <th className="px-4 py-2">Objekt / Titel</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2 text-right">Netto CHF</th>
            </tr>
          </thead>
          <tbody>
            {reports.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-neutral-400">
                  Noch keine Rapporte. Lege den ersten an.
                </td>
              </tr>
            )}
            {reports.map((r) => (
              <tr key={r.id} className="border-b last:border-0 hover:bg-neutral-50">
                <td className="px-4 py-2">
                  <Link href={`/reports/${r.id}`} className="font-medium text-gaba">
                    {rapportNr(r.rapportBasis, r.rapportSuffix) || "—"}
                  </Link>
                </td>
                <td className="px-4 py-2">
                  {r.datum.toLocaleDateString("de-CH")}
                </td>
                <td className="px-4 py-2">
                  {r.objekt || r.project?.name || "—"}
                  {r.titel ? <span className="text-neutral-400"> · {r.titel}</span> : null}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLE[r.status]}`}
                  >
                    {STATUS_LABEL[r.status]}
                  </span>
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {formatCHF(Number(r.nettoInklMwst))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatCHF } from "@/lib/calc";
import { rapportNr } from "@/lib/utils";
import { restoreReport, deleteReport } from "@/lib/actions/reports";
import { Button } from "@/components/ui";

export default async function TrashPage() {
  const reports = await prisma.report.findMany({
    where: { deletedAt: { not: null } },
    orderBy: { deletedAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Papierkorb</h1>
        <Link href="/dashboard" className="text-sm text-gaba hover:underline">
          ← zurück
        </Link>
      </div>
      <p className="text-sm text-neutral-500">
        Gelöschte Rapporte. Du kannst sie wiederherstellen oder endgültig löschen.
      </p>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-neutral-50 text-left text-neutral-500">
            <tr>
              <th className="px-4 py-2">Rapport-Nr.</th>
              <th className="px-4 py-2">Datum</th>
              <th className="px-4 py-2">Objekt / Titel</th>
              <th className="px-4 py-2 text-right">Netto CHF</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {reports.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-neutral-400">
                  Papierkorb ist leer.
                </td>
              </tr>
            )}
            {reports.map((r) => (
              <tr key={r.id} className="border-b last:border-0">
                <td className="px-4 py-2 font-medium">
                  {rapportNr(r.rapportBasis, r.rapportSuffix) || "—"}
                </td>
                <td className="px-4 py-2">{r.datum.toLocaleDateString("de-CH")}</td>
                <td className="px-4 py-2">
                  {[r.objekt, r.titel].filter(Boolean).join(" · ") || "—"}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {formatCHF(Number(r.nettoInklMwst))}
                </td>
                <td className="px-4 py-2">
                  <div className="flex justify-end gap-2">
                    <form action={restoreReport.bind(null, r.id)}>
                      <Button type="submit" variant="secondary">Wiederherstellen</Button>
                    </form>
                    <form action={deleteReport.bind(null, r.id)}>
                      <Button type="submit" variant="danger">Endgültig löschen</Button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

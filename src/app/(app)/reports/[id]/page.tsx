import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatCHF } from "@/lib/calc";
import { rapportNr } from "@/lib/utils";
import { deleteReport } from "@/lib/actions/reports";
import { StatusControls } from "@/components/StatusControls";
import { SendForm } from "@/components/SendForm";
import { Button } from "@/components/ui";

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const report = await prisma.report.findUnique({
    where: { id },
    include: { emails: { orderBy: { gesendetAm: "desc" } } },
  });
  if (!report) notFound();

  const nr = rapportNr(report.rapportBasis, report.rapportSuffix) || "(ohne Nr.)";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Rapport {nr}</h1>
          <p className="text-sm text-neutral-500">
            {report.objekt} · {report.titel}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/reports/${id}/edit`}>
            <Button variant="secondary">Bearbeiten</Button>
          </Link>
          <a href={`/reports/${id}/pdf?download=1`}>
            <Button>PDF herunterladen</Button>
          </a>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-4">
        <StatusControls id={id} status={report.status} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        {/* PDF-Vorschau */}
        <div className="rounded-lg border bg-white p-2">
          <iframe
            src={`/reports/${id}/pdf`}
            className="h-[800px] w-full rounded"
            title="PDF-Vorschau"
          />
        </div>

        <div className="space-y-5">
          <div className="rounded-lg border bg-white p-4">
            <h2 className="mb-2 text-sm font-semibold">Summen</h2>
            <div className="flex justify-between text-sm">
              <span>Total brutto</span>
              <span className="tabular-nums">{formatCHF(Number(report.bruttoTotal))}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold">
              <span>Netto inkl. MwSt.</span>
              <span className="tabular-nums">{formatCHF(Number(report.nettoInklMwst))}</span>
            </div>
          </div>

          <div className="rounded-lg border bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold">Per E-Mail senden</h2>
            <SendForm
              reportId={id}
              defaultSubject={`Regiebericht ${nr}${report.objekt ? " – " + report.objekt : ""}`}
            />
          </div>

          <div className="rounded-lg border bg-white p-4">
            <h2 className="mb-2 text-sm font-semibold">Versand-Historie</h2>
            {report.emails.length === 0 ? (
              <p className="text-sm text-neutral-400">Noch nichts versendet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {report.emails.map((e) => (
                  <li key={e.id} className="border-b pb-1 last:border-0">
                    <div className="flex justify-between">
                      <span>{e.empfaenger}</span>
                      <span
                        className={
                          e.status === "GESENDET" ? "text-green-600" : "text-red-600"
                        }
                      >
                        {e.status}
                      </span>
                    </div>
                    <div className="text-xs text-neutral-400">
                      {e.gesendetAm.toLocaleString("de-CH")}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <form action={deleteReport.bind(null, id)}>
            <Button variant="danger" type="submit">
              Rapport löschen
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

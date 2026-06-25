import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { loadReport } from "@/lib/report-data";
import { ReportForm, type EmployeeOption } from "@/components/ReportForm";
import { PhotoManager } from "@/components/PhotoManager";
import type { ReportPayload } from "@/lib/actions/reports";

const n = (v: unknown) => (v == null ? 0 : Number(v));

export default async function EditReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [report, employees] = await Promise.all([
    loadReport(id),
    prisma.employee.findMany({ where: { aktiv: true }, orderBy: { vorname: "asc" } }),
  ]);
  if (!report) notFound();

  const initial: ReportPayload = {
    id: report.id,
    rapportBasis: report.rapportBasis,
    rapportSuffix: report.rapportSuffix,
    datum: report.datum.toISOString(),
    kw: report.kw,
    wochenStart: report.wochenStart?.toISOString() ?? null,
    bauleitung: report.bauleitung,
    objekt: report.objekt,
    leistung: report.leistung,
    titel: report.titel,
    ausgefuehrteArbeiten: report.ausgefuehrteArbeiten,
    rabattPct: n(report.rabattPct),
    skontoPct: n(report.skontoPct),
    abzugPct: n(report.abzugPct),
    mwstPct: n(report.mwstPct),
    zeigeAbzuege: report.zeigeAbzuege,
    lines: report.lines.map((l) => ({
      resourceId: l.resourceId,
      artikelNr: l.artikelNr,
      bezeichnung: l.bezeichnung,
      gruppe: l.gruppe,
      employeeId: l.employeeId,
      tageswerte: [l.tag1, l.tag2, l.tag3, l.tag4, l.tag5, l.tag6].map((t) =>
        t == null ? null : Number(t)
      ),
      einheit: l.einheit,
      anzahl: n(l.anzahl),
      preis: n(l.preis),
      total: n(l.total),
    })),
  };

  const empOptions: EmployeeOption[] = employees.map((e) => ({
    id: e.id,
    vorname: e.vorname,
    nachname: e.nachname,
    funktion: e.funktion,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Rapport bearbeiten</h1>
        <Link href={`/reports/${id}`} className="text-sm text-gaba hover:underline">
          → Vorschau / PDF
        </Link>
      </div>
      <ReportForm initial={initial} employees={empOptions} />
      <PhotoManager
        reportId={id}
        photos={report.photos.map((p) => ({ id: p.id, name: p.url }))}
      />
    </div>
  );
}

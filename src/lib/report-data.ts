/** Lädt einen Report aus der DB und mappt ihn auf das PDF-Template-Modell. */
import { prisma } from "./prisma";
import { logoDataUrl, stampDataUrl } from "./assets";
import { photoDataUrl } from "./storage";
import { rapportNr } from "./utils";
import { computeTotals, type LineInput } from "./calc";
import type { PdfReport, PdfLine } from "./pdf-template";

/** 6 Arbeitstags-Labels ab Wochenstart, Wochenende übersprungen (wie Excel). */
export function deriveTagLabels(start?: Date | null): string[] {
  if (!start) return ["", "", "", "", "", ""];
  const labels: string[] = [];
  const d = new Date(start);
  for (let i = 0; i < 6; i++) {
    labels.push(
      `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.`
    );
    const wd = d.getDay(); // 0=So ... 5=Fr ... 6=Sa
    d.setDate(d.getDate() + (wd === 5 ? 3 : 1)); // Fr -> Mo überspringen
  }
  return labels;
}

function toNum(v: unknown): number {
  return v == null ? 0 : Number(v);
}

export type ReportWithRelations = Awaited<ReturnType<typeof loadReport>>;

export function loadReport(id: string) {
  return prisma.report.findUnique({
    where: { id },
    include: {
      lines: { orderBy: { sortIndex: "asc" } },
      photos: { orderBy: { sortIndex: "asc" } },
      customer: true,
      project: true,
    },
  });
}

/** Baut das PdfReport-Modell inkl. eingebetteter Bilder/Assets. */
export async function buildPdfReport(id: string): Promise<PdfReport | null> {
  const r = await loadReport(id);
  if (!r) return null;

  const photos: string[] = [];
  for (const p of r.photos) {
    const url = await photoDataUrl(p.url);
    if (url) photos.push(url);
  }

  const lines: PdfLine[] = r.lines.map((l) => ({
    artikelNr: l.artikelNr,
    bezeichnung: l.bezeichnung,
    gruppe: l.gruppe,
    tageswerte: [l.tag1, l.tag2, l.tag3, l.tag4, l.tag5, l.tag6].map((t) =>
      t == null ? null : Number(t)
    ),
    einheit: l.einheit,
    anzahl: toNum(l.anzahl),
    preis: toNum(l.preis),
  }));

  return {
    datum: r.datum.toLocaleDateString("de-CH"),
    kw: r.kw ?? "",
    rapportNr: rapportNr(r.rapportBasis, r.rapportSuffix),
    bauleitung: r.bauleitung,
    objekt: r.objekt,
    leistung: r.leistung,
    titel: r.titel,
    ausgefuehrteArbeiten: r.ausgefuehrteArbeiten,
    tagLabels: deriveTagLabels(r.wochenStart),
    lines,
    photos,
    rabattPct: toNum(r.rabattPct),
    rabattBetrag: toNum(r.rabattBetrag),
    skontoPct: toNum(r.skontoPct),
    abzugPct: toNum(r.abzugPct),
    mwstPct: toNum(r.mwstPct),
    zeigeAbzuege: r.zeigeAbzuege,
    logoDataUrl: logoDataUrl(),
    stampDataUrl: stampDataUrl(),
  };
}

/** Summen neu berechnen und im Report persistieren. */
export async function recomputeAndPersistTotals(reportId: string) {
  const r = await loadReport(reportId);
  if (!r) return;
  const t = computeTotals({
    lines: r.lines.map<LineInput>((l) => ({
      tageswerte: [l.tag1, l.tag2, l.tag3, l.tag4, l.tag5, l.tag6].map((x) =>
        x == null ? null : Number(x)
      ),
      anzahl: toNum(l.anzahl),
      preis: toNum(l.preis),
    })),
    rabattPct: toNum(r.rabattPct),
    rabattBetrag: toNum(r.rabattBetrag),
    skontoPct: toNum(r.skontoPct),
    abzugPct: toNum(r.abzugPct),
    mwstPct: toNum(r.mwstPct),
  });
  await prisma.report.update({
    where: { id: reportId },
    data: { bruttoTotal: t.bruttoTotal, nettoInklMwst: t.nettoInklMwst },
  });
}

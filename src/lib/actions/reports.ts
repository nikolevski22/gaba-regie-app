"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { recomputeAndPersistTotals, buildPdfReport } from "@/lib/report-data";
import { renderReportHtml } from "@/lib/pdf-template";
import { htmlToPdf } from "@/lib/pdf";
import { sendMail } from "@/lib/mail";
import { savePhoto, deletePhoto } from "@/lib/storage";
import { rapportNr } from "@/lib/utils";

const lineSchema = z.object({
  resourceId: z.string().nullish(),
  artikelNr: z.string().nullish(),
  bezeichnung: z.string().min(1),
  gruppe: z.enum(["PERSONAL", "MASCHINE", "FAHRZEUG", "MATERIAL", "SONSTIGES"]),
  employeeId: z.string().nullish(),
  tageswerte: z.array(z.number().nullable()).max(6),
  einheit: z.string(),
  anzahl: z.number(),
  preis: z.number(),
  total: z.number(),
});

const reportSchema = z.object({
  id: z.string().nullish(),
  rapportBasis: z.string().nullish(),
  rapportSuffix: z.string().nullish(),
  datum: z.string(), // ISO
  kw: z.number().nullish(),
  wochenStart: z.string().nullish(),
  tagLabels: z.array(z.string()).default([]),
  bauleitung: z.string().nullish(),
  objekt: z.string().nullish(),
  leistung: z.string().nullish(),
  titel: z.string().nullish(),
  ausgefuehrteArbeiten: z.string().nullish(),
  rabattPct: z.number().default(0),
  rabattBetrag: z.number().default(0),
  skontoPct: z.number().default(0),
  skontoBetrag: z.number().default(0),
  abzugPct: z.number().default(0),
  mwstPct: z.number().default(0.081),
  zeigeAbzuege: z.boolean().default(false),
  lines: z.array(lineSchema),
});

export type ReportPayload = z.infer<typeof reportSchema>;

export async function saveReport(payload: ReportPayload) {
  const data = reportSchema.parse(payload);
  const session = await auth();

  // Rapport-Nr.: Basis manuell, Suffix wird automatisch vergeben (-1, -2, …).
  const basis = data.rapportBasis?.trim() || null;
  let suffix: string | null = null;
  if (basis) {
    const existing = data.id
      ? await prisma.report.findUnique({ where: { id: data.id } })
      : null;
    if (existing && existing.rapportBasis === basis && existing.rapportSuffix) {
      // Basis unverändert → bestehende Nummer behalten
      suffix = existing.rapportSuffix;
    } else {
      // Höchsten vorhandenen Suffix dieser Basis ermitteln (+1), kollisionssicher
      const siblings = await prisma.report.findMany({
        where: {
          rapportBasis: basis,
          ...(data.id ? { id: { not: data.id } } : {}),
        },
        select: { rapportSuffix: true },
      });
      const maxN = siblings.reduce((m, s) => {
        const n = parseInt(s.rapportSuffix ?? "0", 10);
        return Number.isNaN(n) ? m : Math.max(m, n);
      }, 0);
      suffix = String(maxN + 1);
    }
  }

  const header = {
    rapportBasis: basis,
    rapportSuffix: suffix,
    rapportNr: rapportNr(basis, suffix) || null,
    datum: new Date(data.datum),
    kw: data.kw ?? null,
    wochenStart: data.wochenStart ? new Date(data.wochenStart) : null,
    tagLabels: data.tagLabels,
    bauleitung: data.bauleitung ?? null,
    objekt: data.objekt ?? null,
    leistung: data.leistung ?? null,
    titel: data.titel ?? null,
    ausgefuehrteArbeiten: data.ausgefuehrteArbeiten ?? null,
    rabattPct: data.rabattPct,
    rabattBetrag: data.rabattBetrag,
    skontoPct: data.skontoPct,
    skontoBetrag: data.skontoBetrag,
    abzugPct: data.abzugPct,
    mwstPct: data.mwstPct,
    zeigeAbzuege: data.zeigeAbzuege,
  };

  const lineData = data.lines.map((l, i) => ({
    resourceId: l.resourceId ?? null,
    artikelNr: l.artikelNr ?? null,
    bezeichnung: l.bezeichnung,
    gruppe: l.gruppe,
    employeeId: l.employeeId ?? null,
    tag1: l.tageswerte[0] ?? null,
    tag2: l.tageswerte[1] ?? null,
    tag3: l.tageswerte[2] ?? null,
    tag4: l.tageswerte[3] ?? null,
    tag5: l.tageswerte[4] ?? null,
    tag6: l.tageswerte[5] ?? null,
    einheit: l.einheit,
    anzahl: l.anzahl,
    preis: l.preis,
    total: l.total,
    sortIndex: i,
  }));

  let id = data.id ?? undefined;

  if (id) {
    await prisma.report.update({ where: { id }, data: header });
    await prisma.reportLine.deleteMany({ where: { reportId: id } });
    if (lineData.length)
      await prisma.reportLine.createMany({
        data: lineData.map((l) => ({ ...l, reportId: id! })),
      });
  } else {
    const created = await prisma.report.create({
      data: {
        ...header,
        authorId: session?.user ? (session.user as { id?: string }).id : null,
        lines: { create: lineData },
      },
    });
    id = created.id;
  }

  await recomputeAndPersistTotals(id);
  revalidatePath("/dashboard");
  revalidatePath(`/reports/${id}`);
  return { id };
}

export async function createEmptyReport() {
  const session = await auth();
  const created = await prisma.report.create({
    data: {
      datum: new Date(),
      authorId: session?.user ? (session.user as { id?: string }).id : null,
    },
  });
  redirect(`/reports/${created.id}/edit`);
}

/** Digitale Unterschrift der Bauherrschaft speichern → Status "Unterzeichnet". */
export async function saveSignature(reportId: string, dataUrl: string, name: string) {
  if (!dataUrl.startsWith("data:image/")) throw new Error("Ungültige Unterschrift");
  await prisma.report.update({
    where: { id: reportId },
    data: {
      signaturBauherr: dataUrl,
      signaturName: name || null,
      signaturAm: new Date(),
      status: "UNTERZEICHNET",
    },
  });
  revalidatePath(`/reports/${reportId}`);
  revalidatePath("/dashboard");
}

export async function clearSignature(reportId: string) {
  await prisma.report.update({
    where: { id: reportId },
    data: { signaturBauherr: null, signaturName: null, signaturAm: null },
  });
  revalidatePath(`/reports/${reportId}`);
}

export async function setReportStatus(id: string, status: string) {
  await prisma.report.update({
    where: { id },
    data: { status: status as never },
  });
  revalidatePath(`/reports/${id}`);
  revalidatePath("/dashboard");
}

/** In den Papierkorb verschieben (Soft-Delete). */
export async function softDeleteReport(id: string) {
  await prisma.report.update({ where: { id }, data: { deletedAt: new Date() } });
  revalidatePath("/dashboard");
  revalidatePath("/reports/trash");
}

/** Aus dem Papierkorb wiederherstellen. */
export async function restoreReport(id: string) {
  await prisma.report.update({ where: { id }, data: { deletedAt: null } });
  revalidatePath("/dashboard");
  revalidatePath("/reports/trash");
}

/** Endgültig löschen (aus dem Papierkorb). */
export async function deleteReport(id: string) {
  await prisma.report.delete({ where: { id } });
  revalidatePath("/dashboard");
  revalidatePath("/reports/trash");
}

/** Vom Detail aus: in den Papierkorb und zurück zur Übersicht. */
export async function trashReportAndRedirect(id: string) {
  await prisma.report.update({ where: { id }, data: { deletedAt: new Date() } });
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function uploadPhotos(reportId: string, formData: FormData) {
  const files = formData.getAll("photos").filter((f): f is File => f instanceof File);
  let i = await prisma.reportPhoto.count({ where: { reportId } });
  for (const file of files) {
    if (file.size === 0) continue;
    const name = await savePhoto(file);
    await prisma.reportPhoto.create({
      data: { reportId, url: name, sortIndex: i++ },
    });
  }
  revalidatePath(`/reports/${reportId}/edit`);
  revalidatePath(`/reports/${reportId}`);
}

export async function removePhoto(photoId: string) {
  const photo = await prisma.reportPhoto.findUnique({ where: { id: photoId } });
  if (!photo) return;
  await deletePhoto(photo.url);
  await prisma.reportPhoto.delete({ where: { id: photoId } });
  revalidatePath(`/reports/${photo.reportId}/edit`);
}

/** PDF erzeugen (Buffer) für Download/Versand. */
export async function generatePdf(reportId: string): Promise<Buffer | null> {
  const model = await buildPdfReport(reportId);
  if (!model) return null;
  const html = renderReportHtml(model);
  return htmlToPdf(html);
}

export async function sendReport(
  reportId: string,
  to: string,
  subject: string,
  message: string
) {
  const to2 = (to ?? "").trim();
  if (!to2) return { status: "FEHLGESCHLAGEN" as const, fehler: "Kein Empfänger angegeben." };

  try {
    const pdf = await generatePdf(reportId);
    if (!pdf) return { status: "FEHLGESCHLAGEN" as const, fehler: "PDF konnte nicht erstellt werden." };

    const report = await prisma.report.findUnique({ where: { id: reportId } });
    const nr = rapportNr(report?.rapportBasis, report?.rapportSuffix) || "Rapport";

    const res = await sendMail({
      to: to2,
      subject,
      text: message,
      attachments: [
        { filename: `Regiebericht_${nr}.pdf`, content: pdf, contentType: "application/pdf" },
      ],
    });

    await prisma.emailLog.create({
      data: { reportId, empfaenger: to2, betreff: subject, status: "GESENDET", fehler: null },
    });
    await prisma.report.update({ where: { id: reportId }, data: { status: "GESENDET" } });
    revalidatePath(`/reports/${reportId}`);
    revalidatePath("/dashboard");
    return { status: "GESENDET" as const, fehler: null, dryRun: res.dryRun };
  } catch (e) {
    const fehler = e instanceof Error ? e.message : String(e);
    await prisma.emailLog
      .create({ data: { reportId, empfaenger: to2, betreff: subject, status: "FEHLGESCHLAGEN", fehler } })
      .catch(() => {});
    return { status: "FEHLGESCHLAGEN" as const, fehler };
  }
}

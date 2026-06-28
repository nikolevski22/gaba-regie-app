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
  bauleitung: z.string().nullish(),
  objekt: z.string().nullish(),
  leistung: z.string().nullish(),
  titel: z.string().nullish(),
  ausgefuehrteArbeiten: z.string().nullish(),
  rabattPct: z.number().default(0),
  rabattBetrag: z.number().default(0),
  skontoPct: z.number().default(0),
  abzugPct: z.number().default(0),
  mwstPct: z.number().default(0.081),
  zeigeAbzuege: z.boolean().default(false),
  lines: z.array(lineSchema),
});

export type ReportPayload = z.infer<typeof reportSchema>;

export async function saveReport(payload: ReportPayload) {
  const data = reportSchema.parse(payload);
  const session = await auth();

  const header = {
    rapportBasis: data.rapportBasis ?? null,
    rapportSuffix: data.rapportSuffix ?? null,
    rapportNr: rapportNr(data.rapportBasis, data.rapportSuffix) || null,
    datum: new Date(data.datum),
    kw: data.kw ?? null,
    wochenStart: data.wochenStart ? new Date(data.wochenStart) : null,
    bauleitung: data.bauleitung ?? null,
    objekt: data.objekt ?? null,
    leistung: data.leistung ?? null,
    titel: data.titel ?? null,
    ausgefuehrteArbeiten: data.ausgefuehrteArbeiten ?? null,
    rabattPct: data.rabattPct,
    rabattBetrag: data.rabattBetrag,
    skontoPct: data.skontoPct,
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

export async function setReportStatus(id: string, status: string) {
  await prisma.report.update({
    where: { id },
    data: { status: status as never },
  });
  revalidatePath(`/reports/${id}`);
  revalidatePath("/dashboard");
}

export async function deleteReport(id: string) {
  await prisma.report.delete({ where: { id } });
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
  const pdf = await generatePdf(reportId);
  if (!pdf) throw new Error("Report nicht gefunden");
  const report = await prisma.report.findUnique({ where: { id: reportId } });
  const nr = rapportNr(report?.rapportBasis, report?.rapportSuffix) || "Rapport";

  let status: "GESENDET" | "FEHLGESCHLAGEN" = "GESENDET";
  let fehler: string | null = null;
  try {
    await sendMail({
      to,
      subject,
      text: message,
      attachments: [
        { filename: `Regiebericht_${nr}.pdf`, content: pdf, contentType: "application/pdf" },
      ],
    });
  } catch (e) {
    status = "FEHLGESCHLAGEN";
    fehler = e instanceof Error ? e.message : String(e);
  }

  await prisma.emailLog.create({
    data: { reportId, empfaenger: to, betreff: subject, status, fehler },
  });
  if (status === "GESENDET") {
    await prisma.report.update({ where: { id: reportId }, data: { status: "GESENDET" } });
  }
  revalidatePath(`/reports/${reportId}`);
  return { status, fehler };
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { computeTotals } from "@/lib/calc";
import { renderCollectionHtml, type ZsRow } from "@/lib/collection-template";
import { htmlToPdf } from "@/lib/pdf";
import { sendMail } from "@/lib/mail";
import { logoDataUrl } from "@/lib/assets";
import { rapportNr } from "@/lib/utils";

const num = (v: unknown) => (v == null ? 0 : Number(v));

export async function createCollection(formData: FormData) {
  const c = await prisma.collection.create({
    data: { name: String(formData.get("name") ?? "Sammelrapport").trim() },
  });
  redirect(`/collections/${c.id}`);
}

export async function updateCollection(id: string, formData: FormData) {
  await prisma.collection.update({
    where: { id },
    data: {
      name: String(formData.get("name") ?? "").trim(),
      uReferenz: String(formData.get("uReferenz") ?? "").trim() || null,
      email: String(formData.get("email") ?? "").trim() || null,
      rabattPct: num(formData.get("rabattPct")),
      skontoPct: num(formData.get("skontoPct")),
      abzugPct: num(formData.get("abzugPct")),
      mwstPct: num(formData.get("mwstPct")) || 0.081,
    },
  });
  await recompute(id);
  revalidatePath(`/collections/${id}`);
}

export async function addReportToCollection(collectionId: string, reportId: string) {
  await prisma.report.update({ where: { id: reportId }, data: { collectionId } });
  await recompute(collectionId);
  revalidatePath(`/collections/${collectionId}`);
}

export async function removeReportFromCollection(collectionId: string, reportId: string) {
  await prisma.report.update({ where: { id: reportId }, data: { collectionId: null } });
  await recompute(collectionId);
  revalidatePath(`/collections/${collectionId}`);
}

export async function deleteCollection(id: string) {
  await prisma.report.updateMany({ where: { collectionId: id }, data: { collectionId: null } });
  await prisma.collection.delete({ where: { id } });
  revalidatePath("/collections");
  redirect("/collections");
}

async function recompute(id: string) {
  const c = await prisma.collection.findUnique({
    where: { id },
    include: { reports: true },
  });
  if (!c) return;
  const t = computeTotals({
    lines: c.reports.map((r) => ({ anzahl: 1, preis: num(r.bruttoTotal) })),
    rabattPct: num(c.rabattPct),
    skontoPct: num(c.skontoPct),
    abzugPct: num(c.abzugPct),
    mwstPct: num(c.mwstPct),
  });
  await prisma.collection.update({
    where: { id },
    data: { bruttoTotal: t.bruttoTotal, nettoInklMwst: t.nettoInklMwst },
  });
}

export async function buildCollectionPdf(id: string): Promise<Buffer | null> {
  const c = await prisma.collection.findUnique({
    where: { id },
    include: { reports: { orderBy: { datum: "asc" } } },
  });
  if (!c) return null;
  const rows: ZsRow[] = c.reports.map((r) => ({
    rapportNr: rapportNr(r.rapportBasis, r.rapportSuffix),
    bezeichnung: r.titel || r.objekt || "",
    betrag: num(r.bruttoTotal),
  }));
  const html = renderCollectionHtml({
    name: c.name,
    datum: c.datum.toLocaleDateString("de-CH"),
    uReferenz: c.uReferenz,
    email: c.email,
    rows,
    rabattPct: num(c.rabattPct),
    skontoPct: num(c.skontoPct),
    abzugPct: num(c.abzugPct),
    mwstPct: num(c.mwstPct),
    zeigeAbzuege:
      num(c.rabattPct) > 0 || num(c.skontoPct) > 0 || num(c.abzugPct) > 0 || true,
    logoDataUrl: logoDataUrl(),
  });
  return htmlToPdf(html);
}

export async function sendCollection(id: string, to: string, subject: string, message: string) {
  const pdf = await buildCollectionPdf(id);
  if (!pdf) throw new Error("Sammelrapport nicht gefunden");
  let status: "GESENDET" | "FEHLGESCHLAGEN" = "GESENDET";
  let fehler: string | null = null;
  try {
    await sendMail({
      to,
      subject,
      text: message,
      attachments: [
        { filename: `Sammelrapport.pdf`, content: pdf, contentType: "application/pdf" },
      ],
    });
  } catch (e) {
    status = "FEHLGESCHLAGEN";
    fehler = e instanceof Error ? e.message : String(e);
  }
  await prisma.emailLog.create({
    data: { collectionId: id, empfaenger: to, betreff: subject, status, fehler },
  });
  if (status === "GESENDET")
    await prisma.collection.update({ where: { id }, data: { status: "GESENDET" } });
  revalidatePath(`/collections/${id}`);
  return { status, fehler };
}

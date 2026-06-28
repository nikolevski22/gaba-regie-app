"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { getDefaultMwst } from "./settings";

type Gruppe = "PERSONAL" | "MASCHINE" | "FAHRZEUG" | "MATERIAL" | "SONSTIGES";

// Standard-Positionen aus Beispiel 1 / Rapport-Vorlage 2025 (immer wiederkehrend).
const BEISPIEL1_LINES: {
  artikelNr: string;
  bezeichnung: string;
  gruppe: Gruppe;
  einheit: string;
  preis: number;
}[] = [
  { artikelNr: "1.021.07", bezeichnung: "Vorarbeiter", gruppe: "PERSONAL", einheit: "Std", preis: 120.65 },
  { artikelNr: "1.021.11", bezeichnung: "Gipser", gruppe: "PERSONAL", einheit: "Std", preis: 108.45 },
  { artikelNr: "1.021.11", bezeichnung: "Gipser", gruppe: "PERSONAL", einheit: "Std", preis: 108.45 },
  { artikelNr: "1.021.11", bezeichnung: "Gipser", gruppe: "PERSONAL", einheit: "Std", preis: 108.45 },
  { artikelNr: "1.021.14", bezeichnung: "Hilfsgipser", gruppe: "PERSONAL", einheit: "Std", preis: 94.7 },
  { artikelNr: "3.042.50", bezeichnung: "Kleinmaschinen diverse", gruppe: "MASCHINE", einheit: "Std", preis: 5.2 },
  { artikelNr: "3.042.50", bezeichnung: "Kleinmaschinen diverse", gruppe: "MASCHINE", einheit: "Tag", preis: 24.8 },
  { artikelNr: "3.042.63", bezeichnung: "Putzfräse inkl. Schleifsatz", gruppe: "MASCHINE", einheit: "Tag", preis: 78.15 },
  { artikelNr: "3.042.53", bezeichnung: "Rührwerk Flex", gruppe: "MASCHINE", einheit: "Tag", preis: 35.35 },
  { artikelNr: "6.032.25", bezeichnung: "Bausperrgut", gruppe: "SONSTIGES", einheit: "m³", preis: 210 },
  { artikelNr: "6.031.01", bezeichnung: "Lieferwagen bis 3.5 t", gruppe: "FAHRZEUG", einheit: "Std", preis: 148 },
];

export async function createBeispiel1Template() {
  await prisma.template.create({
    data: {
      name: "Standard (Verputzarbeiten)",
      lines: { create: BEISPIEL1_LINES.map((l, i) => ({ ...l, sortIndex: i })) },
    },
  });
  revalidatePath("/admin/templates");
}

export async function deleteTemplate(id: string) {
  await prisma.template.delete({ where: { id } });
  revalidatePath("/admin/templates");
}

/** Neuer Rapport mit den Standard-Positionen (Verputzarbeiten) — der Normalfall. */
export async function newStandardReport() {
  const session = await auth();
  const mwstPct = await getDefaultMwst();
  const created = await prisma.report.create({
    data: {
      datum: new Date(),
      mwstPct,
      authorId: session?.user ? (session.user as { id?: string }).id : null,
      lines: {
        create: BEISPIEL1_LINES.map((l, i) => ({
          artikelNr: l.artikelNr,
          bezeichnung: l.bezeichnung,
          gruppe: l.gruppe,
          einheit: l.einheit,
          preis: l.preis,
          anzahl: 0,
          total: 0,
          sortIndex: i,
        })),
      },
    },
  });
  redirect(`/reports/${created.id}/edit`);
}

/** Neuen leeren Rapport anlegen und Editor öffnen. */
export async function newBlankReport() {
  const session = await auth();
  const mwstPct = await getDefaultMwst();
  const created = await prisma.report.create({
    data: {
      datum: new Date(),
      mwstPct,
      authorId: session?.user ? (session.user as { id?: string }).id : null,
    },
  });
  redirect(`/reports/${created.id}/edit`);
}

/** Neuen Rapport aus einer Vorlage anlegen (Standard-Positionen kopieren). */
export async function newReportFromTemplate(templateId: string) {
  const session = await auth();
  const [tpl, mwstPct] = await Promise.all([
    prisma.template.findUnique({
      where: { id: templateId },
      include: { lines: { orderBy: { sortIndex: "asc" } } },
    }),
    getDefaultMwst(),
  ]);
  if (!tpl) redirect("/dashboard");

  const created = await prisma.report.create({
    data: {
      datum: new Date(),
      mwstPct,
      titel: null,
      authorId: session?.user ? (session.user as { id?: string }).id : null,
      lines: {
        create: tpl.lines.map((l, i) => ({
          artikelNr: l.artikelNr,
          bezeichnung: l.bezeichnung,
          gruppe: l.gruppe,
          einheit: l.einheit,
          preis: l.preis,
          anzahl: 0,
          total: 0,
          sortIndex: i,
        })),
      },
    },
  });
  redirect(`/reports/${created.id}/edit`);
}

/** Bestehenden Rapport als Vorlage speichern (Formular). */
export async function saveReportAsTemplate(reportId: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: { lines: { orderBy: { sortIndex: "asc" } } },
  });
  if (!report) return;
  await prisma.template.create({
    data: {
      name: name || "Vorlage",
      lines: {
        create: report.lines.map((l, i) => ({
          artikelNr: l.artikelNr,
          bezeichnung: l.bezeichnung,
          gruppe: l.gruppe,
          einheit: l.einheit,
          preis: Number(l.preis),
          sortIndex: i,
        })),
      },
    },
  });
  revalidatePath("/admin/templates");
}

"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { parseGesamteListe, RATES_2025 } from "@/lib/import";

// ---------- Ressourcen (Artikelkatalog) ----------

export async function createResource(formData: FormData) {
  await prisma.resource.create({
    data: {
      artikelNr: String(formData.get("artikelNr") ?? "").trim(),
      bezeichnung: String(formData.get("bezeichnung") ?? "").trim(),
      kategorie: (formData.get("kategorie") as string as never) ?? "MATERIAL",
      einheit: String(formData.get("einheit") ?? "Stk").trim(),
      preis: Number(formData.get("preis") ?? 0),
    },
  });
  revalidatePath("/stammdaten/resources");
}

export async function updateResource(id: string, formData: FormData) {
  await prisma.resource.update({
    where: { id },
    data: {
      bezeichnung: String(formData.get("bezeichnung") ?? "").trim(),
      kategorie: formData.get("kategorie") as string as never,
      einheit: String(formData.get("einheit") ?? "Stk").trim(),
      preis: Number(formData.get("preis") ?? 0),
      aktiv: formData.get("aktiv") === "on",
    },
  });
  revalidatePath("/stammdaten/resources");
}

export async function deleteResource(id: string) {
  await prisma.resource.update({ where: { id }, data: { aktiv: false } });
  revalidatePath("/stammdaten/resources");
}

// ---------- Excel-Import ----------

export async function importResourcesFromUpload(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Keine Datei gewählt." };
  }
  const buf = Buffer.from(await file.arrayBuffer());
  let parsed;
  try {
    parsed = parseGesamteListe(buf);
  } catch {
    return { ok: false, message: "Datei konnte nicht gelesen werden (Format?)." };
  }

  let count = 0;
  for (const r of [...parsed, ...RATES_2025]) {
    await prisma.resource.upsert({
      where: {
        artikelNr_einheit_bezeichnung: {
          artikelNr: r.artikelNr,
          einheit: r.einheit,
          bezeichnung: r.bezeichnung,
        },
      },
      create: r,
      update: { preis: r.preis, kategorie: r.kategorie, mengenHint: r.mengenHint },
    });
    count++;
  }
  revalidatePath("/stammdaten/resources");
  revalidatePath("/import");
  return { ok: true, message: `${count} Artikel importiert/aktualisiert.` };
}

// ---------- Mitarbeiter ----------

// Mitarbeiter = nur Name (Funktion wird im Rapport separat gewählt).
export async function createEmployee(formData: FormData) {
  const vorname = String(formData.get("vorname") ?? "").trim();
  if (!vorname) return;
  await prisma.employee.create({
    data: {
      vorname,
      nachname: String(formData.get("nachname") ?? "").trim() || null,
      funktion: "",
    },
  });
  revalidatePath("/admin/employees");
}

// Bekannte Mitarbeiter (aus den Beispiel-Rapporten) anlegen.
const KNOWN_EMPLOYEES = ["Claudio", "Ibrahim", "Michele", "Lirim", "Alex", "Ibo"];
export async function seedKnownEmployees() {
  for (const vorname of KNOWN_EMPLOYEES) {
    const exists = await prisma.employee.findFirst({ where: { vorname } });
    if (!exists) await prisma.employee.create({ data: { vorname, funktion: "" } });
  }
  revalidatePath("/admin/employees");
}

// Standard-Funktionen mit Ansätzen (LABOR-Ressourcen) sicherstellen.
const STANDARD_FUNKTIONEN = [
  { artikelNr: "1.021.01", bezeichnung: "Bauführer", preis: 141.4 },
  { artikelNr: "1.021.02", bezeichnung: "Polier", preis: 129.1 },
  { artikelNr: "1.021.03", bezeichnung: "AVOR", preis: 129.1 },
  { artikelNr: "1.021.05", bezeichnung: "Equipenchef", preis: 125.6 },
  { artikelNr: "1.021.07", bezeichnung: "Vorarbeiter", preis: 120.65 },
  { artikelNr: "1.021.11", bezeichnung: "Gipser", preis: 108.45 },
  { artikelNr: "1.021.14", bezeichnung: "Hilfsgipser", preis: 94.7 },
  { artikelNr: "1.021.20", bezeichnung: "Maler", preis: 108.45 },
];
export async function seedStandardFunktionen() {
  for (const f of STANDARD_FUNKTIONEN) {
    await prisma.resource.upsert({
      where: {
        artikelNr_einheit_bezeichnung: {
          artikelNr: f.artikelNr,
          einheit: "Std",
          bezeichnung: f.bezeichnung,
        },
      },
      create: { ...f, einheit: "Std", kategorie: "LABOR" },
      update: { preis: f.preis, kategorie: "LABOR" },
    });
  }
  revalidatePath("/admin/funktionen");
}

// Funktion (LABOR-Ressource) anlegen / bearbeiten / entfernen.
export async function createFunktion(formData: FormData) {
  const bezeichnung = String(formData.get("bezeichnung") ?? "").trim();
  if (!bezeichnung) return;
  await prisma.resource.create({
    data: {
      artikelNr: String(formData.get("artikelNr") ?? "").trim() || "1.021.99",
      bezeichnung,
      preis: Number(formData.get("preis") ?? 0),
      einheit: "Std",
      kategorie: "LABOR",
    },
  });
  revalidatePath("/admin/funktionen");
}

export async function updateFunktion(id: string, formData: FormData) {
  await prisma.resource.update({
    where: { id },
    data: {
      bezeichnung: String(formData.get("bezeichnung") ?? "").trim(),
      preis: Number(formData.get("preis") ?? 0),
    },
  });
  revalidatePath("/admin/funktionen");
}

export async function deleteFunktion(id: string) {
  await prisma.resource.update({ where: { id }, data: { aktiv: false } });
  revalidatePath("/admin/funktionen");
}

export async function updateEmployee(id: string, formData: FormData) {
  await prisma.employee.update({
    where: { id },
    data: {
      vorname: String(formData.get("vorname") ?? "").trim(),
      nachname: String(formData.get("nachname") ?? "").trim() || null,
      funktion: String(formData.get("funktion") ?? "").trim(),
      aktiv: formData.get("aktiv") === "on",
    },
  });
  revalidatePath("/stammdaten/employees");
}

export async function deleteEmployee(id: string) {
  await prisma.employee.update({ where: { id }, data: { aktiv: false } });
  revalidatePath("/stammdaten/employees");
}

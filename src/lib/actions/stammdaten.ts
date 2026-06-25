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

export async function createEmployee(formData: FormData) {
  const funktion = String(formData.get("funktion") ?? "").trim();
  const resource = await prisma.resource.findFirst({
    where: { kategorie: "LABOR", bezeichnung: { contains: funktion, mode: "insensitive" } },
  });
  await prisma.employee.create({
    data: {
      vorname: String(formData.get("vorname") ?? "").trim(),
      nachname: String(formData.get("nachname") ?? "").trim() || null,
      funktion,
      resourceId: resource?.id ?? null,
    },
  });
  revalidatePath("/stammdaten/employees");
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

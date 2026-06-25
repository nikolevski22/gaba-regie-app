/**
 * Seed: Erst-Admin + Standard-Mitarbeiter + 2025-Ansätze.
 * Der grosse Artikelkatalog wird separat via `npm run import:resources` geladen.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { RATES_2025 } from "../src/lib/import";

const prisma = new PrismaClient();

async function main() {
  // --- Erst-Admin ---
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@gaba-ag.ch";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "changeme123";
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email },
    create: { email, name: "Administrator", passwordHash, role: "ADMIN" },
    update: {},
  });
  console.log(`Admin bereit: ${email}`);

  // --- 2025-Ansätze (Personal/Maschinen/Fahrzeuge) ---
  for (const r of RATES_2025) {
    await prisma.resource.upsert({
      where: {
        artikelNr_einheit_bezeichnung: {
          artikelNr: r.artikelNr,
          einheit: r.einheit,
          bezeichnung: r.bezeichnung,
        },
      },
      create: r,
      update: { preis: r.preis, kategorie: r.kategorie },
    });
  }

  // --- Beispiel-Mitarbeiter (aus den Beispiel-Rapporten) ---
  const employees = [
    { vorname: "Claudio", funktion: "Vorarbeiter", artikelNr: "1.021.07" },
    { vorname: "Ibrahim", funktion: "Gipser", artikelNr: "1.021.11" },
    { vorname: "Michele", funktion: "Gipser", artikelNr: "1.021.11" },
    { vorname: "Lirim", funktion: "Gipser", artikelNr: "1.021.11" },
    { vorname: "Alex", funktion: "Gipser", artikelNr: "1.021.11" },
    { vorname: "Ibo", funktion: "Maler", artikelNr: "1.021.14" },
  ];

  for (const e of employees) {
    const res = await prisma.resource.findFirst({
      where: { artikelNr: e.artikelNr, kategorie: "LABOR" },
    });
    const exists = await prisma.employee.findFirst({
      where: { vorname: e.vorname, funktion: e.funktion },
    });
    if (!exists) {
      await prisma.employee.create({
        data: { vorname: e.vorname, funktion: e.funktion, resourceId: res?.id ?? null },
      });
    }
  }
  console.log(`${employees.length} Beispiel-Mitarbeiter geprüft/angelegt.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

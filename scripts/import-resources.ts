/**
 * CLI-Import der Stammdaten-Preisliste in die Datenbank.
 *
 *   npm run import:resources -- "../Gesamte Liste.xlsx"
 *
 * Liest die Excel-Liste, leitet Kategorien ab und upsertet alle Artikel.
 * Anschliessend werden die aktuellen 2025-Ansätze als Override angewendet.
 */
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { parseGesamteListe, RATES_2025 } from "../src/lib/import";

const prisma = new PrismaClient();

async function main() {
  const file =
    process.argv[2] ??
    path.resolve(process.cwd(), "..", "Gesamte Liste.xlsx");

  if (!fs.existsSync(file)) {
    console.error(`Datei nicht gefunden: ${file}`);
    process.exit(1);
  }

  console.log(`Lese ${file} ...`);
  const buf = fs.readFileSync(file);
  const resources = parseGesamteListe(buf);
  console.log(`${resources.length} Artikel geparst. Schreibe in DB ...`);

  let count = 0;
  for (const r of resources) {
    await prisma.resource.upsert({
      where: {
        artikelNr_einheit_bezeichnung: {
          artikelNr: r.artikelNr,
          einheit: r.einheit,
          bezeichnung: r.bezeichnung,
        },
      },
      create: r,
      update: {
        preis: r.preis,
        kategorie: r.kategorie,
        mengenHint: r.mengenHint,
        kapitel: r.kapitel,
      },
    });
    if (++count % 500 === 0) console.log(`  ${count} ...`);
  }

  // 2025-Ansätze als autoritative Preise anwenden
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

  const total = await prisma.resource.count();
  console.log(`Fertig. ${total} Ressourcen in der Datenbank.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

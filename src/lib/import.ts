/**
 * Excel-Import der Stammdaten-Preisliste ("Gesamte Liste.xlsx").
 *
 * Liest die sichtbare REGIETARIFE-Liste (Blatt 00_GESAMT) und leitet die
 * Ressourcen-Kategorie aus dem Artikelnummern-Präfix ab.
 * Kalkulationsspalten (K–Q) werden ignoriert.
 */
import * as XLSX from "xlsx";

export type ResourceCategory =
  | "LABOR"
  | "MACHINE"
  | "VEHICLE"
  | "MATERIAL"
  | "DISPOSAL"
  | "OTHER";

export interface ParsedResource {
  artikelNr: string;
  bezeichnung: string;
  kategorie: ResourceCategory;
  einheit: string;
  preis: number;
  mengenHint?: string;
  kapitel?: string;
}

/** Kategorie aus dem Artikelnummern-Präfix bestimmen. */
export function categoryFromArtikelNr(artikelNr: string): ResourceCategory {
  const a = artikelNr.trim();
  if (a.startsWith("1.021")) return "LABOR";
  if (a.startsWith("3.041") || a.startsWith("3.042")) return "MACHINE";
  if (a.startsWith("6.031")) return "VEHICLE";
  if (a.startsWith("6.032")) return "DISPOSAL";
  if (a.startsWith("2.") || a.startsWith("4.") || a.startsWith("5.")) return "MATERIAL";
  return "OTHER";
}

/** Sieht ein Wert wie eine Artikelnummer aus? z. B. 2.271.301 / 6.032.25 / 3.042.3 */
function isArtikelNr(v: unknown): v is string {
  return typeof v === "string" && /^\d+\.\d+(\.\d+)?$/.test(v.trim());
}

function toNumber(v: unknown): number | null {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string") {
    const n = parseFloat(v.replace(/'/g, "").replace(",", "."));
    if (!Number.isNaN(n)) return n;
  }
  return null;
}

function clean(v: unknown): string {
  return typeof v === "string" ? v.trim() : v == null ? "" : String(v);
}

/**
 * Parst das Workbook (als ArrayBuffer/Buffer) in eine Liste von Ressourcen.
 * Nur Zeilen mit gültiger Artikel-Nr. UND numerischem Preis (> 0) werden
 * übernommen — so fallen Trennzeilen, Header und leere Zeilen weg.
 */
export function parseGesamteListe(data: ArrayBuffer | Buffer): ParsedResource[] {
  const wb = XLSX.read(data, { type: "buffer" });
  const ws = wb.Sheets["00_GESAMT"] ?? wb.Sheets[wb.SheetNames[0]];
  // Spalten: A=Artikel, B=Bezeichnung, E=Einheit, F=Preis, G=Mengen, I=Kapitel
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    header: "A",
    raw: true,
    blankrows: false,
  });

  const out: ParsedResource[] = [];
  const seen = new Set<string>();

  for (const r of rows) {
    const artikelNr = clean(r["A"]);
    if (!isArtikelNr(artikelNr)) continue;

    const bezeichnung = clean(r["B"]);
    if (!bezeichnung) continue;

    const preis = toNumber(r["F"]);
    if (preis == null || preis <= 0) continue; // Formel-/Leerpreise überspringen

    const einheit = clean(r["E"]) || "Stk";
    const key = `${artikelNr}|${einheit}|${bezeichnung}`;
    if (seen.has(key)) continue;
    seen.add(key);

    out.push({
      artikelNr,
      bezeichnung,
      kategorie: categoryFromArtikelNr(artikelNr),
      einheit,
      preis,
      mengenHint: clean(r["G"]) || undefined,
      kapitel: clean(r["I"]) || undefined,
    });
  }
  return out;
}

/**
 * Aktuelle 2025-Ansätze aus "Rap_Vorlage 2025.xltm" (autoritativ gegenüber dem
 * älteren Katalog). Werden nach dem Import als Override/Seed angewendet.
 */
export const RATES_2025: ParsedResource[] = [
  { artikelNr: "1.021.07", bezeichnung: "Vorarbeiter", kategorie: "LABOR", einheit: "Std", preis: 120.65 },
  { artikelNr: "1.021.11", bezeichnung: "Gipser", kategorie: "LABOR", einheit: "Std", preis: 108.45 },
  { artikelNr: "1.021.14", bezeichnung: "Hilfsgipser", kategorie: "LABOR", einheit: "Std", preis: 94.7 },
  { artikelNr: "3.042.50", bezeichnung: "Kleinmaschinen diverse", kategorie: "MACHINE", einheit: "Std", preis: 5.2 },
  { artikelNr: "3.042.50", bezeichnung: "Kleinmaschinen diverse", kategorie: "MACHINE", einheit: "Tag", preis: 24.8 },
  { artikelNr: "3.042.63", bezeichnung: "Putzfräse inkl. Schleifsatz", kategorie: "MACHINE", einheit: "Tag", preis: 78.15 },
  { artikelNr: "3.042.53", bezeichnung: "Rührwerk Flex", kategorie: "MACHINE", einheit: "Tag", preis: 35.35 },
  { artikelNr: "6.032.25", bezeichnung: "Bausperrgut", kategorie: "DISPOSAL", einheit: "m³", preis: 210 },
  { artikelNr: "6.031.01", bezeichnung: "Lieferwagen bis 3.5 t", kategorie: "VEHICLE", einheit: "Std", preis: 148 },
];

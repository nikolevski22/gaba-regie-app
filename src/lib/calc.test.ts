import { describe, it, expect } from "vitest";
import {
  round2,
  mround,
  lineAnzahl,
  computeLine,
  computeTotals,
  formatCHF,
} from "./calc";

// Verifikation gegen die echten Beispiel-PDFs (Gandola & Battaini).
// Werte stammen direkt aus Beispiel 1.pdf und Beispiel 2.pdf.

describe("Hilfsfunktionen", () => {
  it("round2 rundet kaufmännisch", () => {
    expect(round2(0.175)).toBe(0.18); // Glasseidengewebestreifen 0.25 × 0.70
    expect(round2(2051.05)).toBe(2051.05);
  });
  it("mround rundet auf 5 Rappen", () => {
    expect(mround(18602.63, 0.05)).toBe(18602.65);
    expect(mround(3346.92, 0.05)).toBe(3346.9);
  });
  it("formatCHF im Schweizer Format", () => {
    expect(formatCHF(2051.05)).toBe("2'051.05");
    expect(formatCHF(18602.65)).toBe("18'602.65");
    expect(formatCHF(105)).toBe("105.00");
  });
});

describe("Positionsberechnung", () => {
  it("Anzahl = Summe der Tageswerte (Vorarbeiter 8.5 + 8.5)", () => {
    expect(lineAnzahl({ tageswerte: [8.5, 8.5], preis: 120.65 })).toBe(17);
  });
  it("Vorarbeiter: 17.00 × 120.65 = 2'051.05", () => {
    const r = computeLine({ tageswerte: [8.5, 8.5], preis: 120.65 });
    expect(r.anzahl).toBe(17);
    expect(r.total).toBe(2051.05);
  });
  it("Rührwerk Flex: 4 × 35.35 = 141.40", () => {
    expect(computeLine({ tageswerte: [1, 1, 1, 1], preis: 35.35 }).total).toBe(141.4);
  });
  it("Material mit manueller Anzahl: Maxit 0.5 × 79.28 = 39.64", () => {
    expect(computeLine({ anzahl: 0.5, preis: 79.28 }).total).toBe(39.64);
  });
  it("Glasseidengewebestreifen: 0.25 × 0.70 = 0.18", () => {
    expect(computeLine({ anzahl: 0.25, preis: 0.7 }).total).toBe(0.18);
  });
});

describe("Beispiel 1 (Rapport 25100002-5) — ohne Abzüge", () => {
  // Positionen aus Beispiel 1.pdf
  const lines = [
    { tageswerte: [8.5, 8.5], preis: 120.65 }, // Vorarbeiter -> 2051.05
    { tageswerte: [1, 1, 1, 1], preis: 35.35 }, // Rührwerk -> 141.40
    { anzahl: 0.5, preis: 210 }, // Bausperrgut -> 105.00
    { tageswerte: [1, 1, 1, 1], preis: 148 }, // Lieferwagen -> 592.00
    { anzahl: 6, preis: 25.5 }, // Fixit 622 -> 153.00
    { anzahl: 1, preis: 38.05 }, // Gipskartonplatten -> 38.05
    { anzahl: 2, preis: 58 }, // Fixit 764 -> 116.00
    { anzahl: 2, preis: 27.25 }, // Maxit 290 -> 54.50
    { anzahl: 0.25, preis: 0.7 }, // Glasseidengewebestreifen -> 0.18
    { anzahl: 11, preis: 5.1 }, // Kantenschutzwinkel -> 56.10
    { anzahl: 0.5, preis: 79.28 }, // Maxit 290 E -> 39.64
  ];

  it("Total brutto = 3'346.92", () => {
    const t = computeTotals({ lines, mwstPct: 0.081 });
    expect(t.bruttoTotal).toBe(3346.92);
  });
});

describe("Beispiel 2 (Rapport 26100149-1) — mit MwSt", () => {
  it("MwSt 8.1 % auf 17'208.72 = 1'393.91 und Netto = 18'602.65", () => {
    // Bruttosumme direkt aus PDF (Positionssumme bereits geprüft im Betrieb)
    const brutto = 17208.72;
    // Eine künstliche Einzelposition mit diesem Total, um die Summen-Kaskade zu prüfen
    const t = computeTotals({
      lines: [{ anzahl: 1, preis: brutto }],
      mwstPct: 0.081,
    });
    expect(t.bruttoTotal).toBe(17208.72);
    expect(t.mwst).toBe(1393.91);
    expect(t.nettoInklMwst).toBe(18602.65);
  });

  it("Abzugskaskade rechnet konsistent", () => {
    const t = computeTotals({
      lines: [{ anzahl: 1, preis: 10000 }],
      rabattPct: 0.05,
      skontoPct: 0.02,
      mwstPct: 0.081,
    });
    expect(t.bruttoTotal).toBe(10000);
    expect(t.rabatt).toBe(500);
    expect(t.skonto).toBe(190); // (10000-500)*0.02
    expect(t.mwstBasis).toBe(9310);
    expect(t.mwst).toBe(754.11);
  });
});

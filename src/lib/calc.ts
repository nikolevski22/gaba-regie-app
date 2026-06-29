/**
 * Zentrale Berechnungslogik für Regieberichte.
 *
 * Abgeleitet 1:1 aus "Rap_Vorlage 2025.xltm" und verifiziert gegen
 * Beispiel 1.pdf / Beispiel 2.pdf (siehe calc.test.ts).
 *
 * Diese Funktionen sind die EINZIGE Quelle der Wahrheit für Beträge —
 * verwendet in Formular-Vorschau, PDF und Persistenz.
 */

/** Kaufmännisch auf 2 Dezimalstellen runden. */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Auf ein Vielfaches von `step` runden (Excel MROUND). Default 5 Rappen. */
export function mround(value: number, step = 0.05): number {
  if (step === 0) return value;
  return Math.round(value / step) * step;
}

/** Eine Position (Zeile) im Regiebericht. */
export interface LineInput {
  /** Bis zu 6 Tageswerte. Leere/undefined zählen als 0. */
  tageswerte?: (number | null | undefined)[];
  /** Direkt erfasste Menge (überschreibt Summe der Tageswerte, falls keine Tageswerte). */
  anzahl?: number | null;
  /** Einzelpreis (aus Katalog oder überschrieben). */
  preis: number;
}

export interface LineResult {
  anzahl: number;
  preis: number;
  total: number;
}

/**
 * Anzahl einer Position bestimmen:
 * - Wenn Tageswerte erfasst sind → Summe der Tageswerte.
 * - Sonst → manuell erfasste `anzahl`.
 */
export function lineAnzahl(line: LineInput): number {
  const tw = (line.tageswerte ?? []).filter(
    (v): v is number => typeof v === "number" && !Number.isNaN(v)
  );
  if (tw.length > 0) {
    return round2(tw.reduce((a, b) => a + b, 0));
  }
  return round2(line.anzahl ?? 0);
}

/** Total einer Position = round2(Anzahl × Preis). */
export function computeLine(line: LineInput): LineResult {
  const anzahl = lineAnzahl(line);
  const preis = line.preis ?? 0;
  return { anzahl, preis, total: round2(anzahl * preis) };
}

export interface TotalsInput {
  lines: LineInput[];
  /** Prozentsätze als Dezimal, z. B. 0.05 = 5 %. Abzüge wirken reduzierend. */
  rabattPct?: number;
  /** Fixer Rabattbetrag in CHF. Hat Vorrang vor rabattPct, wenn > 0. */
  rabattBetrag?: number;
  skontoPct?: number;
  /** Fixer Skontobetrag in CHF. Hat Vorrang vor skontoPct, wenn > 0. */
  skontoBetrag?: number;
  abzugPct?: number;
  /** MwSt-Satz, Default 8.1 %. */
  mwstPct?: number;
}

export interface TotalsResult {
  bruttoTotal: number;
  rabatt: number;
  skonto: number;
  abzug: number;
  mwstBasis: number;
  mwst: number;
  nettoInklMwst: number;
  lines: LineResult[];
}

/**
 * Kaskadierende Summenberechnung (exakt wie Excel-Vorlage):
 *   Total brutto   = Σ Positionstotale
 *   Rabatt         = brutto × rabattPct          (reduzierend)
 *   Skonto         = (brutto - rabatt) × skontoPct
 *   Allg. Abzug    = (brutto - rabatt - skonto) × abzugPct
 *   MwSt-Basis     = brutto - rabatt - skonto - abzug
 *   MwSt           = MwSt-Basis × mwstPct
 *   Netto inkl.    = MROUND(MwSt-Basis + MwSt, 0.05)
 *
 * Hinweis: In der Excel-Vorlage sind die Abzugs-Prozente negativ hinterlegt;
 * hier werden positive Prozentsätze als reduzierende Beträge interpretiert.
 */
export function computeTotals(input: TotalsInput): TotalsResult {
  const rabattPct = input.rabattPct ?? 0;
  const skontoPct = input.skontoPct ?? 0;
  const abzugPct = input.abzugPct ?? 0;
  const mwstPct = input.mwstPct ?? 0.081;

  const rabattBetrag = input.rabattBetrag ?? 0;

  const lines = input.lines.map(computeLine);
  const bruttoTotal = round2(lines.reduce((a, l) => a + l.total, 0));

  const skontoBetrag = input.skontoBetrag ?? 0;

  // Fixer Betrag hat jeweils Vorrang vor Prozent.
  const rabatt =
    rabattBetrag > 0 ? round2(rabattBetrag) : round2(bruttoTotal * rabattPct);
  const skonto =
    skontoBetrag > 0 ? round2(skontoBetrag) : round2((bruttoTotal - rabatt) * skontoPct);
  const abzug = round2((bruttoTotal - rabatt - skonto) * abzugPct);

  const mwstBasis = round2(bruttoTotal - rabatt - skonto - abzug);
  const mwst = round2(mwstBasis * mwstPct);
  const nettoInklMwst = round2(mround(mwstBasis + mwst, 0.05));

  return { bruttoTotal, rabatt, skonto, abzug, mwstBasis, mwst, nettoInklMwst, lines };
}

/** Schweizer Zahlenformat: Tausender-Apostroph, 2 Dezimalstellen. z. B. 2'051.05 */
export function formatCHF(value: number): string {
  const fixed = round2(value).toFixed(2);
  const [intPart, dec] = fixed.split(".");
  const sign = intPart.startsWith("-") ? "-" : "";
  const digits = intPart.replace("-", "");
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, "'");
  return `${sign}${grouped}.${dec}`;
}

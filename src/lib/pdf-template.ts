/**
 * HTML-Template für den Regiebericht im Stil der Excel-Vorlage.
 * Wird sowohl für die Bildschirm-Vorschau als auch für die PDF-Erzeugung
 * (Playwright) verwendet — eine einzige Layout-Quelle.
 *
 * Bewusst inline-CSS, damit es ohne Tailwind/Build in Playwright rendert.
 */
import { computeTotals, formatCHF, type LineInput } from "./calc";

export interface PdfLine {
  artikelNr?: string | null;
  bezeichnung: string;
  gruppe: "PERSONAL" | "MASCHINE" | "FAHRZEUG" | "MATERIAL" | "SONSTIGES";
  tageswerte?: (number | null)[];
  einheit: string;
  anzahl?: number | null;
  preis: number;
}

export interface PdfReport {
  datum?: string; // bereits formatiert, z. B. "20.02.2026"
  kw?: number | string | null;
  rapportNr?: string | null;
  bauleitung?: string | null;
  objekt?: string | null;
  leistung?: string | null;
  titel?: string | null;
  ausgefuehrteArbeiten?: string | null;
  tagLabels: string[]; // 6 Spaltenüberschriften (Datumskürzel)
  lines: PdfLine[];
  photos?: string[]; // Bild-URLs / Data-URLs
  rabattPct?: number;
  rabattBetrag?: number;
  skontoPct?: number;
  abzugPct?: number;
  mwstPct?: number;
  zeigeAbzuege?: boolean;
  // Assets
  logoDataUrl?: string;
  stampDataUrl?: string;
  // Firmenangaben
  firma?: string;
  fusszeile?: string;
}

const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

function num(v: number | null | undefined): string {
  if (v == null || v === 0) return "";
  return formatCHF(v).replace(/\.00$/, ".00");
}

function qty(v: number | null | undefined): string {
  if (v == null || v === 0) return "";
  // Tageswerte ohne überflüssige Nullen
  return Number.isInteger(v) ? String(v) : String(v);
}

const GROUP_ORDER: PdfLine["gruppe"][] = [
  "PERSONAL",
  "MASCHINE",
  "FAHRZEUG",
  "SONSTIGES",
  "MATERIAL",
];

export function renderReportHtml(r: PdfReport): string {
  const mwstPct = r.mwstPct ?? 0.081;
  const totals = computeTotals({
    lines: r.lines.map<LineInput>((l) => ({
      tageswerte: l.tageswerte,
      anzahl: l.anzahl,
      preis: l.preis,
    })),
    rabattPct: r.rabattPct,
    rabattBetrag: r.rabattBetrag,
    skontoPct: r.skontoPct,
    abzugPct: r.abzugPct,
    mwstPct,
  });

  // Zeilen in Reihenfolge der Gruppen, "Material" mit Zwischenüberschrift
  const ordered: PdfLine[] = [];
  for (const g of GROUP_ORDER) {
    ordered.push(...r.lines.filter((l) => l.gruppe === g));
  }

  const dayCols = r.tagLabels.slice(0, 6);
  while (dayCols.length < 6) dayCols.push("");

  let materialHeaderInserted = false;
  const bodyRows = ordered
    .map((l, idx) => {
      const lineResult = totals.lines[r.lines.indexOf(l)] ?? { anzahl: 0, total: 0 };
      let prefix = "";
      if (l.gruppe === "MATERIAL" && !materialHeaderInserted) {
        materialHeaderInserted = true;
        prefix = `<tr class="grp"><td></td><td class="grp-label">Material</td>${"<td></td>".repeat(
          6
        )}<td></td><td></td><td></td><td></td></tr>`;
      }
      const tw = (l.tageswerte ?? []).slice(0, 6);
      while (tw.length < 6) tw.push(null);
      const dayCells = tw.map((v) => `<td class="c">${qty(v)}</td>`).join("");
      return (
        prefix +
        `<tr>
          <td class="art">${esc(l.artikelNr ?? "")}</td>
          <td class="bez">${esc(l.bezeichnung)}</td>
          ${dayCells}
          <td class="c">${esc(l.einheit)}</td>
          <td class="r">${lineResult.anzahl ? lineResult.anzahl.toFixed(2) : ""}</td>
          <td class="r">${num(l.preis)}</td>
          <td class="r">${num(lineResult.total)}</td>
        </tr>`
      );
    })
    .join("");

  // Leerzeilen auffüllen für gleichmässige Optik
  const minRows = 18;
  const fillCount = Math.max(0, minRows - ordered.length - (materialHeaderInserted ? 1 : 0));
  const fillRows = Array.from({ length: fillCount })
    .map(
      () =>
        `<tr class="empty"><td></td><td></td>${"<td></td>".repeat(
          6
        )}<td></td><td></td><td></td><td></td></tr>`
    )
    .join("");

  const dayHeaders = dayCols.map((d) => `<th class="c day">${esc(d)}</th>`).join("");

  const photosBand =
    r.photos && r.photos.length
      ? `<div class="photos">${r.photos
          .slice(0, 4)
          .map((p) => `<img src="${esc(p)}" />`)
          .join("")}</div>`
      : "";

  const rabattRow =
    totals.rabatt > 0
      ? `<tr><td class="tl">Rabatt</td><td class="tr">− ${num(totals.rabatt)}</td></tr>`
      : "";
  const abzugRows = `
      ${rabattRow}
      <tr><td class="tl">MwSt ${(mwstPct * 100).toFixed(1)}%</td><td class="tr">${num(
        totals.mwst
      )}</td></tr>
      <tr class="net"><td class="tl">Netto inkl. MwSt.</td><td class="tr">${num(
        totals.nettoInklMwst
      )}</td></tr>`;

  const firma = r.firma ?? "Gandola &amp; Battaini AG";
  const fusszeile =
    r.fusszeile ??
    "Frankentalerstrasse 70 – 8049 Zürich – Tel. 044 371 85 80 – Fax 044 371 85 81 · info@gaba-ag.ch – www.gaba-ag.ch – CHE-101.940.490 MWST";

  return `<!DOCTYPE html>
<html lang="de"><head><meta charset="utf-8"/>
<style>
  @page { size: A4; margin: 10mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10.5px; color: #000; margin: 0; }
  .sheet { width: 190mm; }
  table { border-collapse: collapse; width: 100%; }
  .head td { border: 0.5px solid #000; padding: 3px 5px; vertical-align: top; font-size: 10.5px; }
  .head .lbl { width: 80px; color:#000; }
  .head .titel { font-weight: bold; }
  .logo-cell { border: 0 !important; text-align: right; vertical-align: top; width: 130px; }
  .logo-cell img { width: 120px; }
  .arbeiten td { border: 0.5px solid #000; height: 18px; padding: 3px 5px; font-size: 10.5px; }

  table.pos { margin-top: 5px; table-layout: fixed; }
  table.pos th, table.pos td { border: 0.5px solid #000; padding: 2px 4px; font-weight: normal; font-size: 10px; overflow: hidden; }
  table.pos th { background:#fff; font-weight: bold; }
  .art { width: 7%; }
  .bez { width: 27%; }
  .day { width: 4.2%; }
  .c { text-align: center; width: 5%; }
  .r { text-align: right; width: 11.3%; }
  tr.empty td { height: 17px; }
  tr.grp .grp-label { font-weight: bold; }
  .photos { display:flex; gap:4px; margin-top:6px; }
  .photos img { height: 150px; width: auto; object-fit: cover; border:0.5px solid #000; }

  .footer { margin-top: 6px; display:flex; gap:0; }
  .footer .box { border:0.5px solid #000; padding:4px 6px; }
  .sig { flex:1; min-height: 70px; position: relative; }
  .sig .title { text-align:center; font-weight:bold; }
  .sig .stamp { position:absolute; bottom:4px; left:6px; height:44px; }
  .totals { width: 230px; }
  .totals table { width:100%; }
  .totals td { border:0.5px solid #000; padding:2px 5px; }
  .totals .tl { font-weight: normal; }
  .totals .tr { text-align:right; }
  .totals .brutto td { font-weight:bold; }
  .totals .net td { font-weight:bold; }
  .companyfoot { margin-top:8px; }
  .companyfoot .name { color:#1a2a8f; font-weight:bold; font-size:10px; }
  .companyfoot .addr { color:#444; font-size:7.5px; margin-top:2px; }
</style></head>
<body><div class="sheet">

  <table class="head">
    <tr>
      <td class="lbl">Datum:</td><td>${esc(r.datum ?? "")}</td>
      <td class="lbl">KW</td><td>${esc(r.kw ?? "")}</td>
      <td class="lbl">Rapport Nr.:</td><td>${esc(r.rapportNr ?? "")}</td>
      <td class="logo-cell" rowspan="6">${
        r.logoDataUrl ? `<img src="${r.logoDataUrl}"/>` : ""
      }</td>
    </tr>
    <tr><td class="lbl">Bauleitung:</td><td colspan="5">${esc(r.bauleitung ?? "")}</td></tr>
    <tr><td class="lbl">Objekt:</td><td colspan="5">${esc(r.objekt ?? "")}</td></tr>
    <tr><td class="lbl">Leistung:</td><td colspan="5">${esc(r.leistung ?? "")}</td></tr>
    <tr><td class="lbl">Titel:</td><td colspan="5" class="titel">${esc(r.titel ?? "")}</td></tr>
    <tr><td class="lbl">Ausgeführte Arbeiten:</td><td colspan="5"></td></tr>
  </table>

  <table class="arbeiten">
    ${(r.ausgefuehrteArbeiten ?? "")
      .split("\n")
      .filter((x) => x.trim() !== "")
      .map((line) => `<tr><td>${esc(line)}</td></tr>`)
      .join("") || "<tr><td></td></tr><tr><td></td></tr>"}
  </table>

  <table class="pos">
    <thead><tr>
      <th class="art">Artikel</th>
      <th class="bez">Bezeichnung</th>
      ${dayHeaders}
      <th class="c">Einh.</th>
      <th class="r">Anzahl</th>
      <th class="r">Preis (CHF)</th>
      <th class="r">Total (CHF)</th>
    </tr></thead>
    <tbody>
      ${bodyRows}
      ${fillRows}
    </tbody>
  </table>

  ${photosBand}

  <div class="footer">
    <div class="box sig">
      <div class="title">${firma}</div>
      <div>Datum: ${esc(r.datum ?? "")}</div>
      <div>Unterschrift:</div>
      ${r.stampDataUrl ? `<img class="stamp" src="${r.stampDataUrl}"/>` : ""}
    </div>
    <div class="box sig">
      <div class="title">Für die Bauherrschaft</div>
      <div>Datum:</div>
      <div>Unterschrift:</div>
    </div>
    <div class="box totals">
      <table>
        <tr class="brutto"><td class="tl">Total brutto CHF</td><td class="tr">${num(
          totals.bruttoTotal
        )}</td></tr>
        ${abzugRows}
      </table>
    </div>
  </div>

  <div class="companyfoot">
    <div class="name">${firma}</div>
    <div class="addr">${fusszeile}</div>
  </div>

</div></body></html>`;
}

/** HTML-Template für den Sammelrapport (Zusammenstellung / ZS). */
import { computeTotals, formatCHF } from "./calc";

export interface ZsRow {
  rapportNr: string;
  bezeichnung: string;
  betrag: number;
}

export interface ZsModel {
  name: string;
  datum?: string;
  uReferenz?: string | null;
  email?: string | null;
  bauleitung?: string | null;
  objekt?: string | null;
  rows: ZsRow[];
  rabattPct?: number;
  skontoPct?: number;
  abzugPct?: number;
  mwstPct?: number;
  zeigeAbzuege?: boolean;
  logoDataUrl?: string;
  firma?: string;
  fusszeile?: string;
}

const esc = (s: unknown) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function renderCollectionHtml(m: ZsModel): string {
  const totals = computeTotals({
    lines: m.rows.map((r) => ({ anzahl: 1, preis: r.betrag })),
    rabattPct: m.rabattPct,
    skontoPct: m.skontoPct,
    abzugPct: m.abzugPct,
    mwstPct: m.mwstPct ?? 0.081,
  });

  const rows = m.rows
    .map(
      (r) => `<tr>
        <td>${esc(r.rapportNr)}</td>
        <td>${esc(r.bezeichnung)}</td>
        <td class="r">${formatCHF(r.betrag)}</td>
      </tr>`
    )
    .join("");

  const firma = m.firma ?? "Gandola &amp; Battaini AG";
  const fuss =
    m.fusszeile ??
    "Frankentalerstrasse 70 – 8049 Zürich – Tel. 044 371 85 80 · info@gaba-ag.ch – CHE-101.940.490 MWST";

  const abzug = m.zeigeAbzuege
    ? `<tr><td class="tl">Rabatt</td><td class="r">${formatCHF(totals.rabatt)}</td></tr>
       <tr><td class="tl">Skonto</td><td class="r">${formatCHF(totals.skonto)}</td></tr>
       <tr><td class="tl">Allg. Abzug</td><td class="r">${formatCHF(totals.abzug)}</td></tr>
       <tr><td class="tl">MwSt ${((m.mwstPct ?? 0.081) * 100).toFixed(1)}%</td><td class="r">${formatCHF(totals.mwst)}</td></tr>
       <tr class="net"><td class="tl">Netto inkl. MwSt.</td><td class="r">${formatCHF(totals.nettoInklMwst)}</td></tr>`
    : "";

  return `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"/><style>
    @page { size:A4; margin:12mm; }
    body{font-family:Arial,Helvetica,sans-serif;font-size:10px;color:#000;margin:0;}
    .top{display:flex;justify-content:space-between;align-items:flex-start;}
    .meta td{padding:2px 4px;}
    .logo{width:120px;}
    table.zs{border-collapse:collapse;width:100%;margin-top:10px;}
    table.zs th,table.zs td{border:0.5px solid #000;padding:3px 6px;}
    table.zs th{background:#fff;font-weight:bold;text-align:left;}
    .r{text-align:right;}
    .totals{margin-top:10px;width:300px;margin-left:auto;}
    .totals table{border-collapse:collapse;width:100%;}
    .totals td{border:0.5px solid #000;padding:3px 6px;}
    .totals .brutto td,.totals .net td{font-weight:bold;}
    .foot{margin-top:18px;}.foot .name{color:#1a2a8f;font-weight:bold;}.foot .addr{color:#444;font-size:8px;}
  </style></head><body>
    <div class="top">
      <table class="meta">
        <tr><td><b>Sammelrapport</b></td><td>${esc(m.name)}</td></tr>
        <tr><td>Datum:</td><td>${esc(m.datum ?? "")}</td></tr>
        <tr><td>U. Ref.:</td><td>${esc(m.uReferenz ?? "")}</td></tr>
        <tr><td>Bauleitung:</td><td>${esc(m.bauleitung ?? "")}</td></tr>
        <tr><td>Objekt:</td><td>${esc(m.objekt ?? "")}</td></tr>
      </table>
      ${m.logoDataUrl ? `<img class="logo" src="${m.logoDataUrl}"/>` : ""}
    </div>

    <table class="zs">
      <thead><tr><th style="width:120px">Rapport Nr.</th><th>Bezeichnung</th><th class="r" style="width:120px">Betrag</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>

    <div class="totals"><table>
      <tr class="brutto"><td class="tl">Total brutto CHF</td><td class="r">${formatCHF(totals.bruttoTotal)}</td></tr>
      ${abzug}
    </table></div>

    <div class="foot"><div class="name">${firma}</div><div class="addr">${fuss}</div></div>
  </body></html>`;
}

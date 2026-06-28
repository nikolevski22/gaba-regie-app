"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { computeLine, computeTotals, formatCHF } from "@/lib/calc";
import { saveReport, type ReportPayload } from "@/lib/actions/reports";
import { ResourcePicker, kategorieToGruppe, type ResourceHit } from "./ResourcePicker";
import { Button, Field, Input, Textarea } from "./ui";

type Gruppe = "PERSONAL" | "MASCHINE" | "FAHRZEUG" | "MATERIAL" | "SONSTIGES";

interface FormLine {
  key: string;
  resourceId?: string | null;
  artikelNr?: string | null;
  bezeichnung: string; // Funktions-/Material-Bezeichnung (Basis)
  personName?: string; // bei Personal: Name des Mitarbeiters (separat)
  gruppe: Gruppe;
  employeeId?: string | null;
  tageswerte: (number | null)[];
  einheit: string;
  anzahlManual: number | null;
  preis: number;
}

// Mitarbeiter = nur Name (keine fixe Funktion)
export interface EmployeeOption {
  id: string;
  name: string;
}

// Funktion = LABOR-Artikel mit Stundenansatz
export interface FunktionOption {
  id: string;
  artikelNr?: string | null;
  bezeichnung: string;
  preis: number;
  einheit: string;
}

/** Bezeichnung aus Funktion + Person zusammensetzen. */
function composeBez(funktion: string, person?: string): string {
  return [funktion?.trim(), person?.trim()].filter(Boolean).join(" ");
}

const GRUPPE_LABEL: Record<Gruppe, string> = {
  PERSONAL: "Personal",
  MASCHINE: "Maschine",
  FAHRZEUG: "Fahrzeug",
  SONSTIGES: "Sonstiges",
  MATERIAL: "Material",
};
const GRUPPEN: Gruppe[] = ["PERSONAL", "MASCHINE", "FAHRZEUG", "SONSTIGES", "MATERIAL"];

let counter = 0;
const newKey = () => `l${Date.now()}_${counter++}`;

/** ISO-8601-Kalenderwoche aus einem Datum (YYYY-MM-DD). */
function isoWeek(dateStr: string): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00");
  if (Number.isNaN(d.getTime())) return null;
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function ReportForm({
  initial,
  employees,
  funktionen,
}: {
  initial: ReportPayload;
  funktionen: FunktionOption[];
  employees: EmployeeOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [head, setHead] = useState({
    rapportBasis: initial.rapportBasis ?? "",
    rapportSuffix: initial.rapportSuffix ?? "",
    datum: initial.datum?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    kw:
      initial.kw ??
      isoWeek(initial.datum?.slice(0, 10) ?? new Date().toISOString().slice(0, 10)),
    wochenStart: initial.wochenStart?.slice(0, 10) ?? "",
    bauleitung: initial.bauleitung ?? "",
    objekt: initial.objekt ?? "",
    leistung: initial.leistung ?? "",
    titel: initial.titel ?? "",
    ausgefuehrteArbeiten: initial.ausgefuehrteArbeiten ?? "",
    mwstPct: initial.mwstPct ?? 0.081,
  });

  // Rabatt: wahlweise Prozent oder fixer Betrag
  const initRabattBetrag = initial.rabattBetrag ?? 0;
  const initRabattPct = initial.rabattPct ?? 0;
  const [rabatt, setRabatt] = useState({
    aktiv: initRabattBetrag > 0 || initRabattPct > 0,
    modus: (initRabattBetrag > 0 ? "chf" : "pct") as "pct" | "chf",
    wert: initRabattBetrag > 0 ? initRabattBetrag : initRabattPct * 100,
  });
  const rabattPct = rabatt.aktiv && rabatt.modus === "pct" ? (Number(rabatt.wert) || 0) / 100 : 0;
  const rabattBetrag = rabatt.aktiv && rabatt.modus === "chf" ? Number(rabatt.wert) || 0 : 0;

  const [lines, setLines] = useState<FormLine[]>(
    (initial.lines ?? []).map((l) => ({
      key: newKey(),
      resourceId: l.resourceId,
      artikelNr: l.artikelNr,
      bezeichnung: l.bezeichnung,
      personName: "",
      gruppe: l.gruppe,
      employeeId: l.employeeId,
      tageswerte: [0, 1, 2, 3, 4, 5].map((i) => l.tageswerte[i] ?? null),
      einheit: l.einheit,
      anzahlManual: l.anzahl ?? null,
      preis: l.preis,
    }))
  );

  function updateLine(key: string, patch: Partial<FormLine>) {
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }
  function removeLine(key: string) {
    setLines((ls) => ls.filter((l) => l.key !== key));
  }
  function addFromResource(r: ResourceHit) {
    setLines((ls) => [
      ...ls,
      {
        key: newKey(),
        resourceId: r.id,
        artikelNr: r.artikelNr,
        bezeichnung: r.bezeichnung,
        gruppe: kategorieToGruppe(r.kategorie),
        tageswerte: [null, null, null, null, null, null],
        einheit: r.einheit,
        anzahlManual: null,
        preis: r.preis,
      },
    ]);
  }
  function addEmpty(gruppe: Gruppe) {
    setLines((ls) => [
      ...ls,
      {
        key: newKey(),
        bezeichnung: "",
        gruppe,
        tageswerte: [null, null, null, null, null, null],
        einheit: gruppe === "PERSONAL" ? "Std" : "Stk",
        anzahlManual: null,
        preis: 0,
      },
    ]);
  }

  // Live-Berechnung
  const computed = useMemo(() => {
    const lineInputs = lines.map((l) => {
      const hasDays = l.tageswerte.some((v) => typeof v === "number" && v !== 0);
      return {
        tageswerte: hasDays ? l.tageswerte : undefined,
        anzahl: hasDays ? undefined : l.anzahlManual ?? 0,
        preis: l.preis,
      };
    });
    const totals = computeTotals({
      lines: lineInputs,
      rabattPct,
      rabattBetrag,
      mwstPct: head.mwstPct,
    });
    return totals;
  }, [lines, rabattPct, rabattBetrag, head.mwstPct]);

  function lineResult(l: FormLine) {
    const hasDays = l.tageswerte.some((v) => typeof v === "number" && v !== 0);
    return computeLine({
      tageswerte: hasDays ? l.tageswerte : undefined,
      anzahl: hasDays ? undefined : l.anzahlManual ?? 0,
      preis: l.preis,
    });
  }

  function onSave(redirectAfter: boolean) {
    setError(null);
    const payload: ReportPayload = {
      id: initial.id ?? null,
      rapportBasis: head.rapportBasis || null,
      rapportSuffix: head.rapportSuffix || null,
      datum: new Date(head.datum).toISOString(),
      kw: head.kw ? Number(head.kw) : null,
      wochenStart: head.wochenStart ? new Date(head.wochenStart).toISOString() : null,
      bauleitung: head.bauleitung || null,
      objekt: head.objekt || null,
      leistung: head.leistung || null,
      titel: head.titel || null,
      ausgefuehrteArbeiten: head.ausgefuehrteArbeiten || null,
      rabattPct,
      rabattBetrag,
      skontoPct: 0,
      abzugPct: 0,
      mwstPct: Number(head.mwstPct) || 0.081,
      zeigeAbzuege: true,
      lines: lines.map((l) => {
        const r = lineResult(l);
        return {
          resourceId: l.resourceId ?? null,
          artikelNr: l.artikelNr ?? null,
          bezeichnung:
            composeBez(l.bezeichnung, l.personName) || "(ohne Bezeichnung)",
          gruppe: l.gruppe,
          employeeId: l.employeeId ?? null,
          tageswerte: l.tageswerte,
          einheit: l.einheit,
          anzahl: r.anzahl,
          preis: l.preis,
          total: r.total,
        };
      }),
    };
    startTransition(async () => {
      try {
        const { id } = await saveReport(payload);
        if (redirectAfter) router.push(`/reports/${id}`);
        else router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen");
      }
    });
  }

  const sorted = GRUPPEN.flatMap((g) => lines.filter((l) => l.gruppe === g));

  return (
    <div className="space-y-5">
      {/* Kopfdaten */}
      <div className="grid grid-cols-2 gap-3 rounded-lg border bg-white p-4 md:grid-cols-4">
        <Field label="Rapport-Nr. (Basis)">
          <Input
            value={head.rapportBasis}
            onChange={(e) => setHead({ ...head, rapportBasis: e.target.value })}
            placeholder="25100002"
          />
        </Field>
        <Field label="Suffix">
          <Input
            value={head.rapportSuffix}
            onChange={(e) => setHead({ ...head, rapportSuffix: e.target.value })}
            placeholder="5"
          />
        </Field>
        <Field label="Datum">
          <Input
            type="date"
            value={head.datum}
            onChange={(e) =>
              setHead({ ...head, datum: e.target.value, kw: isoWeek(e.target.value) })
            }
          />
        </Field>
        <Field label="KW (automatisch aus Datum)">
          <Input
            type="number"
            value={head.kw ?? ""}
            onChange={(e) => setHead({ ...head, kw: e.target.value ? Number(e.target.value) : null })}
          />
        </Field>
        <Field label="Wochenstart (für Tagesspalten)">
          <Input
            type="date"
            value={head.wochenStart}
            onChange={(e) => setHead({ ...head, wochenStart: e.target.value })}
          />
        </Field>
        <Field label="Bauleitung">
          <Input value={head.bauleitung} onChange={(e) => setHead({ ...head, bauleitung: e.target.value })} />
        </Field>
        <Field label="Objekt">
          <Input value={head.objekt} onChange={(e) => setHead({ ...head, objekt: e.target.value })} />
        </Field>
        <Field label="Leistung">
          <Input value={head.leistung} onChange={(e) => setHead({ ...head, leistung: e.target.value })} />
        </Field>
        <div className="col-span-2 md:col-span-4">
          <Field label="Titel">
            <Input value={head.titel} onChange={(e) => setHead({ ...head, titel: e.target.value })} />
          </Field>
        </div>
        <div className="col-span-2 md:col-span-4">
          <Field label="Ausgeführte Arbeiten (eine Zeile pro Punkt)">
            <Textarea
              rows={4}
              value={head.ausgefuehrteArbeiten}
              onChange={(e) => setHead({ ...head, ausgefuehrteArbeiten: e.target.value })}
            />
          </Field>
        </div>
      </div>

      {/* Positionen */}
      <div className="rounded-lg border bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="w-72">
            <ResourcePicker onPick={addFromResource} placeholder="Artikel suchen & hinzufügen …" />
          </div>
          {GRUPPEN.map((g) => (
            <Button key={g} variant="secondary" onClick={() => addEmpty(g)}>
              + {GRUPPE_LABEL[g]}
            </Button>
          ))}
          <Button
            variant="secondary"
            onClick={() => setRabatt((r) => ({ ...r, aktiv: true }))}
          >
            + Rabatt
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="text-left text-xs text-neutral-500">
              <tr>
                <th className="p-1">Gr.</th>
                <th className="p-1">Artikel</th>
                <th className="p-1">Bezeichnung</th>
                <th className="p-1 text-center" colSpan={6}>Tageswerte</th>
                <th className="p-1">Einh.</th>
                <th className="p-1 text-right">Anzahl</th>
                <th className="p-1 text-right">Preis</th>
                <th className="p-1 text-right">Total</th>
                <th className="p-1"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((l) => {
                const res = lineResult(l);
                const hasDays = l.tageswerte.some((v) => typeof v === "number" && v !== 0);
                return (
                  <tr key={l.key} className="border-t">
                    <td className="p-1">
                      <select
                        value={l.gruppe}
                        onChange={(e) => updateLine(l.key, { gruppe: e.target.value as Gruppe })}
                        className="rounded border px-1 py-1 text-xs"
                      >
                        {GRUPPEN.map((g) => (
                          <option key={g} value={g}>{GRUPPE_LABEL[g]}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-1 text-xs text-neutral-400">{l.artikelNr ?? "—"}</td>
                    <td className="p-1">
                      <div className="flex flex-wrap items-center gap-1">
                        {l.gruppe === "PERSONAL" ? (
                          <>
                            <select
                              value={
                                l.resourceId ??
                                funktionen.find(
                                  (x) =>
                                    x.artikelNr === l.artikelNr &&
                                    x.bezeichnung === l.bezeichnung
                                )?.id ??
                                ""
                              }
                              onChange={(e) => {
                                const f = funktionen.find((x) => x.id === e.target.value);
                                if (!f) return;
                                updateLine(l.key, {
                                  resourceId: f.id,
                                  artikelNr: f.artikelNr,
                                  bezeichnung: f.bezeichnung,
                                  einheit: f.einheit || "Std",
                                  preis: f.preis,
                                });
                              }}
                              className="w-36 rounded border px-1 py-1 text-xs"
                              title="Funktion (bestimmt den Ansatz)"
                            >
                              <option value="">Funktion …</option>
                              {funktionen.map((f) => (
                                <option key={f.id} value={f.id}>
                                  {f.bezeichnung} ({f.preis.toFixed(2)})
                                </option>
                              ))}
                            </select>
                            <select
                              value={l.employeeId ?? ""}
                              onChange={(e) => {
                                const emp = employees.find((x) => x.id === e.target.value);
                                updateLine(l.key, {
                                  employeeId: emp ? emp.id : null,
                                  personName: emp ? emp.name : "",
                                });
                              }}
                              className="w-28 rounded border px-1 py-1 text-xs"
                              title="Mitarbeiter (Name)"
                            >
                              <option value="">Person …</option>
                              {employees.map((emp) => (
                                <option key={emp.id} value={emp.id}>{emp.name}</option>
                              ))}
                            </select>
                            <span className="text-xs text-neutral-500">
                              {composeBez(l.bezeichnung, l.personName) || "—"}
                            </span>
                          </>
                        ) : (
                          <input
                            value={l.bezeichnung}
                            onChange={(e) => updateLine(l.key, { bezeichnung: e.target.value })}
                            className="w-64 rounded border px-2 py-1"
                          />
                        )}
                      </div>
                    </td>
                    {l.tageswerte.map((v, i) => (
                      <td key={i} className="p-1">
                        <input
                          type="number"
                          step="0.25"
                          value={v ?? ""}
                          onChange={(e) => {
                            const tw = [...l.tageswerte];
                            tw[i] = e.target.value === "" ? null : Number(e.target.value);
                            updateLine(l.key, { tageswerte: tw });
                          }}
                          className="w-12 rounded border px-1 py-1 text-center"
                        />
                      </td>
                    ))}
                    <td className="p-1">
                      <input
                        value={l.einheit}
                        onChange={(e) => updateLine(l.key, { einheit: e.target.value })}
                        className="w-14 rounded border px-1 py-1"
                      />
                    </td>
                    <td className="p-1 text-right">
                      {hasDays ? (
                        <span className="tabular-nums">{res.anzahl.toFixed(2)}</span>
                      ) : (
                        <input
                          type="number"
                          step="0.01"
                          value={l.anzahlManual ?? ""}
                          onChange={(e) =>
                            updateLine(l.key, {
                              anzahlManual: e.target.value === "" ? null : Number(e.target.value),
                            })
                          }
                          className="w-16 rounded border px-1 py-1 text-right"
                        />
                      )}
                    </td>
                    <td className="p-1">
                      <input
                        type="number"
                        step="0.01"
                        value={l.preis}
                        onChange={(e) => updateLine(l.key, { preis: Number(e.target.value) })}
                        className="w-20 rounded border px-1 py-1 text-right"
                      />
                    </td>
                    <td className="p-1 text-right tabular-nums">{formatCHF(res.total)}</td>
                    <td className="p-1">
                      <button
                        type="button"
                        onClick={() => removeLine(l.key)}
                        className="text-neutral-400 hover:text-red-600"
                        title="Entfernen"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={13} className="p-6 text-center text-neutral-400">
                    Noch keine Positionen. Artikel oben suchen oder leere Zeile hinzufügen.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summen */}
      <div className="flex flex-col gap-4 md:flex-row md:justify-end">
        <div className="w-full max-w-md rounded-lg border bg-white p-4">
          <div className="space-y-2 text-sm">
            <Row label="Total brutto" value={formatCHF(computed.bruttoTotal)} bold />

            {rabatt.aktiv && (
              <div className="flex items-center justify-between gap-2">
                <span>Rabatt</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.01"
                    value={rabatt.wert || ""}
                    onChange={(e) =>
                      setRabatt({ ...rabatt, wert: Number(e.target.value) || 0 })
                    }
                    className="w-20 rounded border px-2 py-0.5 text-right text-xs"
                  />
                  <select
                    value={rabatt.modus}
                    onChange={(e) =>
                      setRabatt({ ...rabatt, modus: e.target.value as "pct" | "chf" })
                    }
                    className="rounded border px-1 py-0.5 text-xs"
                  >
                    <option value="pct">%</option>
                    <option value="chf">CHF</option>
                  </select>
                  <span className="w-24 text-right tabular-nums">
                    − {formatCHF(computed.rabatt)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setRabatt({ ...rabatt, aktiv: false, wert: 0 })}
                    className="text-neutral-400 hover:text-red-600"
                    title="Rabatt entfernen"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            <Row
              label={`MwSt ${(Number(head.mwstPct) * 100).toFixed(1)} %`}
              value={formatCHF(computed.mwst)}
            />
            <div className="border-t pt-1">
              <Row
                label="Netto inkl. MwSt."
                value={formatCHF(computed.nettoInklMwst)}
                bold
              />
            </div>
            {!rabatt.aktiv && (
              <p className="pt-1 text-xs text-neutral-400">
                Rabatt über den Button „+ Rabatt" oben hinzufügen.
              </p>
            )}
          </div>
        </div>
      </div>

      {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="flex gap-2">
        <Button onClick={() => onSave(true)} disabled={pending}>
          {pending ? "Speichern …" : "Speichern"}
        </Button>
        <Button variant="secondary" onClick={() => onSave(false)} disabled={pending}>
          Übernehmen
        </Button>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-semibold" : ""}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

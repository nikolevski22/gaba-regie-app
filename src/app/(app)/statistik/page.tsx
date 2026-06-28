import { prisma } from "@/lib/prisma";
import { formatCHF } from "@/lib/calc";

const STATUS_LABEL: Record<string, string> = {
  ENTWURF: "Entwurf",
  GESENDET: "Gesendet",
  UNTERZEICHNET: "Unterzeichnet",
  ABGERECHNET: "Abgerechnet",
};

function Card({ title, value, sub }: { title: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="text-xs text-neutral-500">{title}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {sub && <div className="text-xs text-neutral-400">{sub}</div>}
    </div>
  );
}

export default async function StatistikPage() {
  const reports = await prisma.report.findMany({
    where: { deletedAt: null },
    select: { status: true, nettoInklMwst: true, datum: true },
  });

  const personalLines = await prisma.reportLine.findMany({
    where: { gruppe: "PERSONAL", report: { deletedAt: null } },
    select: { anzahl: true, bezeichnung: true, employee: { select: { vorname: true, nachname: true } } },
  });

  // Kennzahlen
  const total = reports.reduce((a, r) => a + Number(r.nettoInklMwst), 0);
  const abgerechnet = reports
    .filter((r) => r.status === "ABGERECHNET")
    .reduce((a, r) => a + Number(r.nettoInklMwst), 0);
  const offen = total - abgerechnet;

  const statusCounts: Record<string, number> = {};
  for (const r of reports) statusCounts[r.status] = (statusCounts[r.status] ?? 0) + 1;

  // Umsatz je Monat (letzte 6 Monate)
  const months: { key: string; label: string; sum: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleDateString("de-CH", { month: "short", year: "2-digit" }),
      sum: 0,
    });
  }
  for (const r of reports) {
    const key = `${r.datum.getFullYear()}-${r.datum.getMonth()}`;
    const m = months.find((x) => x.key === key);
    if (m) m.sum += Number(r.nettoInklMwst);
  }
  const maxMonth = Math.max(1, ...months.map((m) => m.sum));

  // Stunden je Mitarbeiter
  const hours: Record<string, number> = {};
  for (const l of personalLines) {
    const name = l.employee
      ? [l.employee.vorname, l.employee.nachname].filter(Boolean).join(" ")
      : l.bezeichnung || "ohne Zuordnung";
    hours[name] = (hours[name] ?? 0) + Number(l.anzahl);
  }
  const hoursList = Object.entries(hours)
    .map(([name, h]) => ({ name, h }))
    .sort((a, b) => b.h - a.h)
    .slice(0, 12);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Auswertungen</h1>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card title="Rapporte (aktiv)" value={String(reports.length)} />
        <Card title="Total Netto" value={formatCHF(total)} sub="alle Rapporte" />
        <Card title="Offen" value={formatCHF(offen)} sub="noch nicht abgerechnet" />
        <Card title="Abgerechnet" value={formatCHF(abgerechnet)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Umsatz je Monat */}
        <div className="rounded-lg border bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold">Umsatz je Monat (Netto)</h2>
          <div className="space-y-2">
            {months.map((m) => (
              <div key={m.key} className="flex items-center gap-2 text-sm">
                <span className="w-14 text-neutral-500">{m.label}</span>
                <div className="h-4 flex-1 rounded bg-neutral-100">
                  <div
                    className="h-4 rounded bg-gaba"
                    style={{ width: `${(m.sum / maxMonth) * 100}%` }}
                  />
                </div>
                <span className="w-24 text-right tabular-nums">{formatCHF(m.sum)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Status-Verteilung */}
        <div className="rounded-lg border bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold">Rapporte je Status</h2>
          <table className="w-full text-sm">
            <tbody>
              {Object.keys(STATUS_LABEL).map((s) => (
                <tr key={s} className="border-b last:border-0">
                  <td className="py-1.5">{STATUS_LABEL[s]}</td>
                  <td className="py-1.5 text-right tabular-nums">{statusCounts[s] ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stunden je Mitarbeiter */}
      <div className="rounded-lg border bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold">Stunden je Mitarbeiter / Funktion</h2>
        {hoursList.length === 0 ? (
          <p className="text-sm text-neutral-400">Noch keine erfassten Stunden.</p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {hoursList.map((e) => (
                <tr key={e.name} className="border-b last:border-0">
                  <td className="py-1.5">{e.name}</td>
                  <td className="py-1.5 text-right tabular-nums">{e.h.toFixed(2)} Std</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

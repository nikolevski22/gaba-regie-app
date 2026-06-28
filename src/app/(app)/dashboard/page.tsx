import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatCHF } from "@/lib/calc";
import { rapportNr } from "@/lib/utils";
import { NewReportButton } from "@/components/NewReportButton";
import { ReportRow } from "@/components/ReportRow";

const STATUS_LABEL: Record<string, string> = {
  ENTWURF: "Entwurf",
  GESENDET: "Gesendet",
  UNTERZEICHNET: "Unterzeichnet",
  ABGERECHNET: "Abgerechnet",
};
const STATUS_STYLE: Record<string, string> = {
  ENTWURF: "bg-neutral-100 text-neutral-700",
  GESENDET: "bg-blue-100 text-blue-700",
  UNTERZEICHNET: "bg-amber-100 text-amber-700",
  ABGERECHNET: "bg-green-100 text-green-700",
};

type Dir = "asc" | "desc";
function orderByFor(sort: string, dir: Dir) {
  switch (sort) {
    case "rapportBasis":
      return { rapportBasis: dir };
    case "objekt":
      return { objekt: dir };
    case "status":
      return { status: dir };
    case "netto":
      return { nettoInklMwst: dir };
    default:
      return { datum: dir };
  }
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string; dir?: string; sent?: string }>;
}) {
  const { q, sort = "datum", dir = "desc", sent } = await searchParams;
  const direction: Dir = dir === "asc" ? "asc" : "desc";

  const where = {
    deletedAt: null,
    ...(q
      ? {
          OR: [
            { rapportBasis: { contains: q, mode: "insensitive" as const } },
            { rapportSuffix: { contains: q, mode: "insensitive" as const } },
            { objekt: { contains: q, mode: "insensitive" as const } },
            { titel: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [reports, trashCount] = await Promise.all([
    prisma.report.findMany({
      where,
      orderBy: orderByFor(sort, direction),
      take: 200,
    }),
    prisma.report.count({ where: { deletedAt: { not: null } } }),
  ]);

  // Sortierbare Spaltenüberschrift
  function Th({ field, label, align }: { field: string; label: string; align?: string }) {
    const active = sort === field;
    const nextDir = active && direction === "asc" ? "desc" : "asc";
    const params = new URLSearchParams();
    params.set("sort", field);
    params.set("dir", nextDir);
    if (q) params.set("q", q);
    return (
      <th className={`px-4 py-2 ${align === "right" ? "text-right" : "text-left"}`}>
        <Link href={`/dashboard?${params.toString()}`} className="inline-flex items-center gap-1 hover:text-gaba">
          {label}
          <span className="text-[10px]">{active ? (direction === "asc" ? "▲" : "▼") : "↕"}</span>
        </Link>
      </th>
    );
  }

  return (
    <div className="space-y-4">
      {sent && (
        <div className="rounded-md bg-green-50 px-4 py-2 text-sm text-green-700">
          ✓ Rapport wurde per E-Mail gesendet.
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Regieberichte</h1>
        <NewReportButton />
      </div>

      <form action="/dashboard" className="flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Suche (Rapport-Nr., Objekt, Titel)"
          className="w-72 rounded-md border px-3 py-1.5 text-sm"
        />
        <input type="hidden" name="sort" value={sort} />
        <input type="hidden" name="dir" value={dir} />
        <button className="rounded-md border px-3 py-1.5 text-sm hover:bg-neutral-50">Suchen</button>
        {q && (
          <Link href="/dashboard" className="self-center text-sm text-neutral-500 hover:text-gaba">
            Filter zurücksetzen
          </Link>
        )}
      </form>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-neutral-50 text-neutral-500">
            <tr>
              <Th field="rapportBasis" label="Rapport-Nr." />
              <Th field="datum" label="Datum" />
              <Th field="objekt" label="Objekt / Titel" />
              <Th field="status" label="Status" />
              <Th field="netto" label="Netto CHF" align="right" />
              <th className="px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {reports.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-neutral-400">
                  Keine Rapporte gefunden.
                </td>
              </tr>
            )}
            {reports.map((r) => (
              <ReportRow
                key={r.id}
                id={r.id}
                nr={rapportNr(r.rapportBasis, r.rapportSuffix) || "—"}
                datum={r.datum.toLocaleDateString("de-CH")}
                objektTitel={[r.objekt, r.titel].filter(Boolean).join(" · ") || "—"}
                status={r.status}
                netto={formatCHF(Number(r.nettoInklMwst))}
              />
            ))}
          </tbody>
        </table>
      </div>

      {trashCount > 0 && (
        <div className="text-right text-sm">
          <Link href="/reports/trash" className="text-neutral-500 hover:text-gaba">
            🗑 Papierkorb ({trashCount})
          </Link>
        </div>
      )}
    </div>
  );
}

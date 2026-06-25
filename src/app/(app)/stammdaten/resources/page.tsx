import { prisma } from "@/lib/prisma";
import { createResource, updateResource, deleteResource } from "@/lib/actions/stammdaten";
import { Button } from "@/components/ui";

const KATS = ["LABOR", "MACHINE", "VEHICLE", "MATERIAL", "DISPOSAL", "OTHER"];
const KAT_LABEL: Record<string, string> = {
  LABOR: "Personal",
  MACHINE: "Maschine",
  VEHICLE: "Fahrzeug",
  MATERIAL: "Material",
  DISPOSAL: "Entsorgung",
  OTHER: "Sonstiges",
};

export default async function ResourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; kat?: string }>;
}) {
  const { q, kat } = await searchParams;
  const where = {
    aktiv: true,
    ...(kat ? { kategorie: kat as never } : {}),
    ...(q
      ? {
          OR: [
            { bezeichnung: { contains: q, mode: "insensitive" as const } },
            { artikelNr: { contains: q } },
          ],
        }
      : {}),
  };
  const [items, total] = await Promise.all([
    prisma.resource.findMany({ where, orderBy: { bezeichnung: "asc" }, take: 80 }),
    prisma.resource.count({ where: { aktiv: true } }),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Artikelkatalog</h1>
        <span className="text-sm text-neutral-500">{total} Artikel</span>
      </div>

      <form className="flex flex-wrap gap-2" action="/stammdaten/resources">
        <input
          name="q"
          defaultValue={q}
          placeholder="Suche (Bezeichnung oder Artikel-Nr.)"
          className="w-72 rounded-md border px-3 py-1.5 text-sm"
        />
        <select name="kat" defaultValue={kat} className="rounded-md border px-2 text-sm">
          <option value="">Alle Kategorien</option>
          {KATS.map((k) => (
            <option key={k} value={k}>{KAT_LABEL[k]}</option>
          ))}
        </select>
        <Button type="submit" variant="secondary">Suchen</Button>
      </form>

      {/* Neu */}
      <form action={createResource} className="flex flex-wrap items-end gap-2 rounded-lg border bg-white p-3">
        <input name="artikelNr" placeholder="Artikel-Nr." className="w-28 rounded border px-2 py-1 text-sm" required />
        <input name="bezeichnung" placeholder="Bezeichnung" className="w-64 rounded border px-2 py-1 text-sm" required />
        <select name="kategorie" className="rounded border px-2 py-1 text-sm">
          {KATS.map((k) => <option key={k} value={k}>{KAT_LABEL[k]}</option>)}
        </select>
        <input name="einheit" placeholder="Einh." className="w-16 rounded border px-2 py-1 text-sm" defaultValue="Stk" />
        <input name="preis" type="number" step="0.01" placeholder="Preis" className="w-24 rounded border px-2 py-1 text-sm" required />
        <Button type="submit">+ Hinzufügen</Button>
      </form>

      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-neutral-50 text-left text-neutral-500">
            <tr>
              <th className="px-3 py-2">Artikel</th>
              <th className="px-3 py-2">Bezeichnung</th>
              <th className="px-3 py-2">Kat.</th>
              <th className="px-3 py-2">Einh.</th>
              <th className="px-3 py-2">Preis</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id} className="border-b last:border-0">
                <td className="px-3 py-1 text-xs text-neutral-400">{r.artikelNr}</td>
                <td className="px-3 py-1">
                  <form action={updateResource.bind(null, r.id)} className="flex flex-wrap items-center gap-1" id={`f-${r.id}`}>
                    <input name="bezeichnung" defaultValue={r.bezeichnung} className="w-64 rounded border px-2 py-0.5" />
                  </form>
                </td>
                <td className="px-3 py-1">
                  <select name="kategorie" defaultValue={r.kategorie} form={`f-${r.id}`} className="rounded border px-1 py-0.5 text-xs">
                    {KATS.map((k) => <option key={k} value={k}>{KAT_LABEL[k]}</option>)}
                  </select>
                </td>
                <td className="px-3 py-1">
                  <input name="einheit" defaultValue={r.einheit} form={`f-${r.id}`} className="w-14 rounded border px-1 py-0.5" />
                </td>
                <td className="px-3 py-1">
                  <input name="preis" type="number" step="0.01" defaultValue={Number(r.preis)} form={`f-${r.id}`} className="w-20 rounded border px-1 py-0.5 text-right" />
                </td>
                <td className="px-3 py-1">
                  <div className="flex gap-1">
                    <button form={`f-${r.id}`} className="rounded border px-2 py-0.5 text-xs hover:bg-neutral-50">Speichern</button>
                    <form action={deleteResource.bind(null, r.id)}>
                      <button className="rounded border px-2 py-0.5 text-xs text-red-600 hover:bg-red-50">Entf.</button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {items.length === 80 && (
        <p className="text-xs text-neutral-400">Nur die ersten 80 Treffer. Suche eingrenzen.</p>
      )}
    </div>
  );
}

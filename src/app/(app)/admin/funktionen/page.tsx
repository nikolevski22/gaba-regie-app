import { prisma } from "@/lib/prisma";
import {
  createFunktion,
  updateFunktion,
  deleteFunktion,
  seedStandardFunktionen,
} from "@/lib/actions/stammdaten";
import { Button } from "@/components/ui";

export default async function FunktionenPage() {
  const funktionen = await prisma.resource.findMany({
    where: { kategorie: "LABOR", aktiv: true },
    orderBy: { preis: "desc" },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Funktionen &amp; Stundenansätze</h1>
        <form action={seedStandardFunktionen}>
          <Button type="submit" variant="secondary">Standard-Funktionen anlegen</Button>
        </form>
      </div>
      <p className="text-sm text-neutral-500">
        Diese Funktionen mit Ansatz wählst du im Rapport zur jeweiligen Person.
      </p>

      <form action={createFunktion} className="flex flex-wrap items-end gap-2 rounded-lg border bg-white p-3">
        <input name="bezeichnung" placeholder="Funktion (z. B. Maler)" className="w-48 rounded border px-2 py-1 text-sm" required />
        <input name="preis" type="number" step="0.01" placeholder="Ansatz/Std" className="w-28 rounded border px-2 py-1 text-sm" required />
        <input name="artikelNr" placeholder="Artikel-Nr. (optional)" className="w-36 rounded border px-2 py-1 text-sm" />
        <Button type="submit">+ Hinzufügen</Button>
      </form>

      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-neutral-50 text-left text-neutral-500">
            <tr>
              <th className="px-3 py-2">Artikel</th>
              <th className="px-3 py-2">Funktion</th>
              <th className="px-3 py-2">Ansatz/Std</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {funktionen.map((f) => (
              <tr key={f.id} className="border-b last:border-0">
                <td className="px-3 py-1 text-xs text-neutral-400">{f.artikelNr}</td>
                <td className="px-3 py-1">
                  <form id={`f-${f.id}`} action={updateFunktion.bind(null, f.id)}>
                    <input name="bezeichnung" defaultValue={f.bezeichnung} className="w-48 rounded border px-2 py-0.5" />
                  </form>
                </td>
                <td className="px-3 py-1">
                  <input name="preis" type="number" step="0.01" defaultValue={Number(f.preis)} form={`f-${f.id}`} className="w-24 rounded border px-1 py-0.5 text-right" />
                </td>
                <td className="px-3 py-1">
                  <div className="flex justify-end gap-1">
                    <button form={`f-${f.id}`} className="rounded border px-2 py-0.5 text-xs hover:bg-neutral-50">Speichern</button>
                    <form action={deleteFunktion.bind(null, f.id)}>
                      <button className="rounded border px-2 py-0.5 text-xs text-red-600 hover:bg-red-50">Entf.</button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {funktionen.length === 0 && (
              <tr><td colSpan={4} className="px-3 py-6 text-center text-neutral-400">
                Noch keine Funktionen. „Standard-Funktionen anlegen" oben nutzen.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

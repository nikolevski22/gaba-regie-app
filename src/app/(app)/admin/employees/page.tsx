import { prisma } from "@/lib/prisma";
import { createEmployee, deleteEmployee } from "@/lib/actions/stammdaten";
import { Button } from "@/components/ui";

export default async function EmployeesPage() {
  const employees = await prisma.employee.findMany({
    where: { aktiv: true },
    orderBy: [{ funktion: "asc" }, { vorname: "asc" }],
    include: { resource: true },
  });

  const funktionen = await prisma.resource.findMany({
    where: { kategorie: "LABOR", aktiv: true },
    orderBy: { preis: "desc" },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Mitarbeiter</h1>
      <p className="text-sm text-neutral-500">
        Neue Mitarbeiter werden beim Hinzufügen automatisch gespeichert. Die Funktion
        bestimmt den Stundenansatz.
      </p>

      <form action={createEmployee} className="flex flex-wrap items-end gap-2 rounded-lg border bg-white p-3">
        <input name="vorname" placeholder="Vorname" className="w-40 rounded border px-2 py-1 text-sm" required />
        <input name="nachname" placeholder="Nachname (optional)" className="w-40 rounded border px-2 py-1 text-sm" />
        <select name="resourceId" className="w-64 rounded border px-2 py-1 text-sm" required defaultValue="">
          <option value="" disabled>Funktion (Ansatz) wählen …</option>
          {funktionen.map((f) => (
            <option key={f.id} value={f.id}>
              {f.bezeichnung} — {Number(f.preis).toFixed(2)}/{f.einheit}
            </option>
          ))}
        </select>
        <Button type="submit">+ Hinzufügen</Button>
      </form>

      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-neutral-50 text-left text-neutral-500">
            <tr>
              <th className="px-3 py-2">Vorname</th>
              <th className="px-3 py-2">Nachname</th>
              <th className="px-3 py-2">Funktion</th>
              <th className="px-3 py-2">Stundenansatz</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {employees.map((e) => (
              <tr key={e.id} className="border-b last:border-0">
                <td className="px-3 py-2">{e.vorname}</td>
                <td className="px-3 py-2">{e.nachname ?? "—"}</td>
                <td className="px-3 py-2">{e.funktion}</td>
                <td className="px-3 py-2 text-neutral-500">
                  {e.resource ? `${Number(e.resource.preis).toFixed(2)} / ${e.resource.einheit}` : "—"}
                </td>
                <td className="px-3 py-2 text-right">
                  <form action={deleteEmployee.bind(null, e.id)}>
                    <button className="rounded border px-2 py-0.5 text-xs text-red-600 hover:bg-red-50">
                      Entfernen
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {employees.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-neutral-400">Noch keine Mitarbeiter.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

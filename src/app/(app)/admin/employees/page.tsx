import { prisma } from "@/lib/prisma";
import { createEmployee, deleteEmployee, seedKnownEmployees } from "@/lib/actions/stammdaten";
import { Button } from "@/components/ui";

export default async function EmployeesPage() {
  const employees = await prisma.employee.findMany({
    where: { aktiv: true },
    orderBy: { vorname: "asc" },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Mitarbeiter</h1>
        <form action={seedKnownEmployees}>
          <Button type="submit" variant="secondary">Bekannte Mitarbeiter anlegen</Button>
        </form>
      </div>
      <p className="text-sm text-neutral-500">
        Nur Namen. Die Funktion (und damit der Ansatz) wird im Rapport separat gewählt —
        so kann dieselbe Person mal als Vorarbeiter, mal als Maler eingesetzt werden.
      </p>

      <form action={createEmployee} className="flex flex-wrap items-end gap-2 rounded-lg border bg-white p-3">
        <input name="vorname" placeholder="Vorname" className="w-40 rounded border px-2 py-1 text-sm" required />
        <input name="nachname" placeholder="Nachname (optional)" className="w-40 rounded border px-2 py-1 text-sm" />
        <Button type="submit">+ Hinzufügen</Button>
      </form>

      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-neutral-50 text-left text-neutral-500">
            <tr>
              <th className="px-3 py-2">Vorname</th>
              <th className="px-3 py-2">Nachname</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {employees.map((e) => (
              <tr key={e.id} className="border-b last:border-0">
                <td className="px-3 py-2">{e.vorname}</td>
                <td className="px-3 py-2">{e.nachname ?? "—"}</td>
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
              <tr><td colSpan={3} className="px-3 py-6 text-center text-neutral-400">
                Noch keine Mitarbeiter. „Bekannte Mitarbeiter anlegen" oben nutzen.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

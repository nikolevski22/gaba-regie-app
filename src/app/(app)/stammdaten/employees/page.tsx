import { prisma } from "@/lib/prisma";
import { createEmployee, updateEmployee, deleteEmployee } from "@/lib/actions/stammdaten";
import { Button } from "@/components/ui";

export default async function EmployeesPage() {
  const employees = await prisma.employee.findMany({
    where: { aktiv: true },
    orderBy: [{ funktion: "asc" }, { vorname: "asc" }],
    include: { resource: true },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Mitarbeiter</h1>

      <form action={createEmployee} className="flex flex-wrap items-end gap-2 rounded-lg border bg-white p-3">
        <input name="vorname" placeholder="Vorname" className="w-40 rounded border px-2 py-1 text-sm" required />
        <input name="nachname" placeholder="Nachname (optional)" className="w-40 rounded border px-2 py-1 text-sm" />
        <input name="funktion" placeholder="Funktion (z. B. Gipser)" className="w-48 rounded border px-2 py-1 text-sm" required />
        <Button type="submit">+ Hinzufügen</Button>
      </form>

      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-neutral-50 text-left text-neutral-500">
            <tr>
              <th className="px-3 py-2">Vorname</th>
              <th className="px-3 py-2">Nachname</th>
              <th className="px-3 py-2">Funktion</th>
              <th className="px-3 py-2">Lohnansatz</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {employees.map((e) => (
              <tr key={e.id} className="border-b last:border-0">
                <td className="px-3 py-1">
                  <input name="vorname" defaultValue={e.vorname} form={`e-${e.id}`} className="w-36 rounded border px-2 py-0.5" />
                </td>
                <td className="px-3 py-1">
                  <form id={`e-${e.id}`} action={updateEmployee.bind(null, e.id)}>
                    <input name="nachname" defaultValue={e.nachname ?? ""} className="w-36 rounded border px-2 py-0.5" />
                  </form>
                </td>
                <td className="px-3 py-1">
                  <input name="funktion" defaultValue={e.funktion} form={`e-${e.id}`} className="w-44 rounded border px-2 py-0.5" />
                </td>
                <td className="px-3 py-1 text-xs text-neutral-500">
                  {e.resource ? `${Number(e.resource.preis).toFixed(2)} / ${e.resource.einheit}` : "—"}
                </td>
                <td className="px-3 py-1">
                  <div className="flex gap-1">
                    <button form={`e-${e.id}`} className="rounded border px-2 py-0.5 text-xs hover:bg-neutral-50">Speichern</button>
                    <form action={deleteEmployee.bind(null, e.id)}>
                      <button className="rounded border px-2 py-0.5 text-xs text-red-600 hover:bg-red-50">Entf.</button>
                    </form>
                  </div>
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

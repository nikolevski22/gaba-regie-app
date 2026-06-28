import { prisma } from "@/lib/prisma";
import { createBeispiel1Template, deleteTemplate } from "@/lib/actions/templates";
import { Button } from "@/components/ui";

export default async function TemplatesPage() {
  const templates = await prisma.template.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { lines: true } } },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Vorlagen</h1>
      <p className="text-sm text-neutral-500">
        Vorlagen enthalten die Standard-Positionen. Beim Erstellen eines Rapports aus
        einer Vorlage trägst du nur noch Stunden und Personen ein. Du kannst auch jeden
        Rapport über „Als Vorlage speichern" sichern.
      </p>

      <form action={createBeispiel1Template}>
        <Button type="submit" variant="secondary">
          + Standard-Vorlage (Verputzarbeiten) anlegen
        </Button>
      </form>

      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-neutral-50 text-left text-neutral-500">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Positionen</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {templates.map((t) => (
              <tr key={t.id} className="border-b last:border-0">
                <td className="px-4 py-2 font-medium">{t.name}</td>
                <td className="px-4 py-2 text-neutral-500">{t._count.lines}</td>
                <td className="px-4 py-2 text-right">
                  <form action={deleteTemplate.bind(null, t.id)}>
                    <button className="rounded border px-2 py-0.5 text-xs text-red-600 hover:bg-red-50">
                      Löschen
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {templates.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-6 text-center text-neutral-400">
                Noch keine Vorlagen. Lege die Standard-Vorlage an.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

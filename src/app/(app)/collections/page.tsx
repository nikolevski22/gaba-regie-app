import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatCHF } from "@/lib/calc";
import { createCollection } from "@/lib/actions/collections";
import { Button } from "@/components/ui";

export default async function CollectionsPage() {
  const collections = await prisma.collection.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { reports: true } } },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Sammelrapporte</h1>

      <form action={createCollection} className="flex items-end gap-2 rounded-lg border bg-white p-3">
        <input name="name" placeholder="Name des Sammelrapports" className="w-72 rounded border px-2 py-1 text-sm" required />
        <Button type="submit">+ Anlegen</Button>
      </form>

      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-neutral-50 text-left text-neutral-500">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Rapporte</th>
              <th className="px-4 py-2 text-right">Netto CHF</th>
            </tr>
          </thead>
          <tbody>
            {collections.map((c) => (
              <tr key={c.id} className="border-b last:border-0 hover:bg-neutral-50">
                <td className="px-4 py-2">
                  <Link href={`/collections/${c.id}`} className="font-medium text-gaba">{c.name}</Link>
                </td>
                <td className="px-4 py-2">{c._count.reports}</td>
                <td className="px-4 py-2 text-right tabular-nums">{formatCHF(Number(c.nettoInklMwst))}</td>
              </tr>
            ))}
            {collections.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-neutral-400">Noch keine Sammelrapporte.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

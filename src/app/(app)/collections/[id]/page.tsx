import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatCHF } from "@/lib/calc";
import { rapportNr } from "@/lib/utils";
import {
  updateCollection,
  addReportToCollection,
  removeReportFromCollection,
  deleteCollection,
} from "@/lib/actions/collections";
import { CollectionSendForm } from "@/components/CollectionSendForm";
import { Button } from "@/components/ui";

const n = (v: unknown) => (v == null ? 0 : Number(v));

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const collection = await prisma.collection.findUnique({
    where: { id },
    include: { reports: { orderBy: { datum: "asc" } } },
  });
  if (!collection) notFound();

  const available = await prisma.report.findMany({
    where: { collectionId: null },
    orderBy: { datum: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold">Sammelrapport: {collection.name}</h1>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          {/* Einstellungen */}
          <form action={updateCollection.bind(null, id)} className="grid grid-cols-2 gap-3 rounded-lg border bg-white p-4">
            <label className="space-y-1"><span className="text-xs text-neutral-600">Name</span>
              <input name="name" defaultValue={collection.name} className="w-full rounded border px-2 py-1 text-sm" /></label>
            <label className="space-y-1"><span className="text-xs text-neutral-600">U. Ref.</span>
              <input name="uReferenz" defaultValue={collection.uReferenz ?? ""} className="w-full rounded border px-2 py-1 text-sm" /></label>
            <label className="space-y-1"><span className="text-xs text-neutral-600">E-Mail Empfänger</span>
              <input name="email" defaultValue={collection.email ?? ""} className="w-full rounded border px-2 py-1 text-sm" /></label>
            <div className="grid grid-cols-4 gap-2">
              <label className="space-y-1"><span className="text-xs text-neutral-600">Rabatt</span>
                <input name="rabattPct" type="number" step="0.001" defaultValue={n(collection.rabattPct)} className="w-full rounded border px-1 py-1 text-sm" /></label>
              <label className="space-y-1"><span className="text-xs text-neutral-600">Skonto</span>
                <input name="skontoPct" type="number" step="0.001" defaultValue={n(collection.skontoPct)} className="w-full rounded border px-1 py-1 text-sm" /></label>
              <label className="space-y-1"><span className="text-xs text-neutral-600">Abzug</span>
                <input name="abzugPct" type="number" step="0.001" defaultValue={n(collection.abzugPct)} className="w-full rounded border px-1 py-1 text-sm" /></label>
              <label className="space-y-1"><span className="text-xs text-neutral-600">MwSt</span>
                <input name="mwstPct" type="number" step="0.001" defaultValue={n(collection.mwstPct)} className="w-full rounded border px-1 py-1 text-sm" /></label>
            </div>
            <div className="col-span-2"><Button type="submit" variant="secondary">Speichern</Button></div>
          </form>

          {/* Mitglieder */}
          <div className="rounded-lg border bg-white p-4">
            <h2 className="mb-2 text-sm font-semibold">Enthaltene Rapporte</h2>
            <table className="w-full text-sm">
              <tbody>
                {collection.reports.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-1">{rapportNr(r.rapportBasis, r.rapportSuffix) || "—"}</td>
                    <td className="py-1 text-neutral-500">{r.titel || r.objekt}</td>
                    <td className="py-1 text-right tabular-nums">{formatCHF(n(r.bruttoTotal))}</td>
                    <td className="py-1 text-right">
                      <form action={removeReportFromCollection.bind(null, id, r.id)}>
                        <button className="text-xs text-red-600 hover:underline">entfernen</button>
                      </form>
                    </td>
                  </tr>
                ))}
                {collection.reports.length === 0 && (
                  <tr><td className="py-3 text-center text-neutral-400" colSpan={4}>Noch keine Rapporte zugeordnet.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Hinzufügen */}
          <div className="rounded-lg border bg-white p-4">
            <h2 className="mb-2 text-sm font-semibold">Rapport hinzufügen</h2>
            <div className="max-h-64 space-y-1 overflow-auto">
              {available.map((r) => (
                <form key={r.id} action={addReportToCollection.bind(null, id, r.id)} className="flex items-center justify-between border-b py-1 last:border-0">
                  <span className="text-sm">
                    {rapportNr(r.rapportBasis, r.rapportSuffix) || "—"} · {r.titel || r.objekt || "(ohne Titel)"}
                    <span className="text-neutral-400"> · {formatCHF(n(r.bruttoTotal))}</span>
                  </span>
                  <button className="text-xs text-gaba hover:underline">+ hinzufügen</button>
                </form>
              ))}
              {available.length === 0 && <p className="text-sm text-neutral-400">Keine freien Rapporte.</p>}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-lg border bg-white p-4">
            <div className="flex justify-between text-sm"><span>Total brutto</span><span className="tabular-nums">{formatCHF(n(collection.bruttoTotal))}</span></div>
            <div className="flex justify-between text-sm font-semibold"><span>Netto inkl. MwSt.</span><span className="tabular-nums">{formatCHF(n(collection.nettoInklMwst))}</span></div>
            <div className="mt-3 flex gap-2">
              <a href={`/collections/${id}/pdf`} target="_blank"><Button variant="secondary">PDF ansehen</Button></a>
              <a href={`/collections/${id}/pdf?download=1`}><Button>Download</Button></a>
            </div>
          </div>

          <div className="rounded-lg border bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold">Per E-Mail senden</h2>
            <CollectionSendForm
              collectionId={id}
              defaultTo={collection.email ?? ""}
              defaultSubject={`Sammelrapport ${collection.name}`}
            />
          </div>

          <form action={deleteCollection.bind(null, id)}>
            <Button variant="danger" type="submit">Sammelrapport löschen</Button>
          </form>
        </div>
      </div>
    </div>
  );
}

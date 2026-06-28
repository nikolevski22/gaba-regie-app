import { newBlankReport, newStandardReport } from "@/lib/actions/templates";

export function NewReportButton() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <form action={newStandardReport}>
        <button className="rounded-md bg-gaba px-4 py-2 text-sm font-medium text-white hover:bg-gaba-dark">
          + Neuer Rapport mit Vorlage
        </button>
      </form>
      <form action={newBlankReport}>
        <button className="rounded-md border px-3 py-2 text-xs text-neutral-600 hover:bg-neutral-50">
          + leer
        </button>
      </form>
    </div>
  );
}

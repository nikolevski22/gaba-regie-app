import { setReportStatus } from "@/lib/actions/reports";

const FLOW = ["ENTWURF", "GESENDET", "UNTERZEICHNET", "ABGERECHNET"] as const;
const LABEL: Record<string, string> = {
  ENTWURF: "Entwurf",
  GESENDET: "Gesendet",
  UNTERZEICHNET: "Unterzeichnet",
  ABGERECHNET: "Abgerechnet",
};

export function StatusControls({ id, status }: { id: string; status: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-neutral-500">Status setzen:</span>
      {FLOW.map((s) => (
        <form key={s} action={setReportStatus.bind(null, id, s)}>
          <button
            className={`rounded-full border px-3 py-1 text-xs ${
              status === s ? "bg-gaba text-white" : "bg-white hover:bg-neutral-50"
            }`}
          >
            {LABEL[s]}
          </button>
        </form>
      ))}
    </div>
  );
}

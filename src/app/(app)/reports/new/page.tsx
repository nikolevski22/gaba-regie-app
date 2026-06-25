import { createEmptyReport } from "@/lib/actions/reports";
import { Button } from "@/components/ui";

export default function NewReportPage() {
  return (
    <div className="mx-auto max-w-md space-y-4 rounded-lg border bg-white p-6 text-center">
      <h1 className="text-lg font-semibold">Neuer Regiebericht</h1>
      <p className="text-sm text-neutral-500">
        Es wird ein leerer Rapport als Entwurf angelegt, den du anschliessend ausfüllst.
      </p>
      <form action={createEmptyReport}>
        <Button type="submit">Rapport anlegen</Button>
      </form>
    </div>
  );
}

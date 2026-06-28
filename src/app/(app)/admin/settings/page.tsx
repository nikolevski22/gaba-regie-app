import { getAppSettings, updateMwst } from "@/lib/actions/settings";
import { Button } from "@/components/ui";

export default async function SettingsPage() {
  const settings = await getAppSettings();
  const prozent = (Number(settings.mwstPct) * 100).toFixed(1);

  return (
    <div className="max-w-md space-y-4">
      <h1 className="text-xl font-semibold">Einstellungen</h1>

      <form action={updateMwst} className="space-y-3 rounded-lg border bg-white p-4">
        <label className="block space-y-1">
          <span className="text-sm font-medium">MwSt-Satz (%)</span>
          <input
            name="mwstProzent"
            type="number"
            step="0.1"
            defaultValue={prozent}
            className="w-32 rounded border px-3 py-1.5 text-sm"
          />
        </label>
        <p className="text-xs text-neutral-500">
          Gilt als Standard für neue Rapporte. Aktuell: {prozent} %.
        </p>
        <Button type="submit">Speichern</Button>
      </form>
    </div>
  );
}

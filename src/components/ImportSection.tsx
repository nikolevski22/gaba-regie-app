"use client";

import { useState, useTransition } from "react";
import { importResourcesFromUpload } from "@/lib/actions/stammdaten";
import { Button } from "./ui";

export function ImportSection() {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  return (
    <details className="rounded-lg border bg-white p-4">
      <summary className="cursor-pointer text-sm font-semibold">
        Artikel aus Excel importieren (Gesamte Liste.xlsx)
      </summary>
      <p className="mt-2 text-sm text-neutral-600">
        Lädt die Preisliste hoch. Bestehende Artikel werden aktualisiert, neue ergänzt.
      </p>
      <form
        action={(fd) =>
          start(async () => {
            const r = await importResourcesFromUpload(fd);
            setResult(r.message);
          })
        }
        className="mt-3 flex items-center gap-2"
      >
        <input type="file" name="file" accept=".xlsx,.xls" required className="text-sm" />
        <Button type="submit" disabled={pending}>
          {pending ? "Importiere …" : "Import starten"}
        </Button>
      </form>
      {result && (
        <p className="mt-2 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{result}</p>
      )}
    </details>
  );
}

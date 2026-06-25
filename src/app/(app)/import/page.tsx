"use client";

import { useState, useTransition } from "react";
import { importResourcesFromUpload } from "@/lib/actions/stammdaten";
import { Button } from "@/components/ui";

export default function ImportPage() {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-xl font-semibold">Stammdaten-Import</h1>
      <p className="text-sm text-neutral-600">
        Lade die Datei <code>Gesamte Liste.xlsx</code> hoch. Artikel werden anhand der
        Artikelnummer kategorisiert und in den Katalog übernommen (vorhandene Preise
        werden aktualisiert). Die aktuellen 2025-Ansätze werden automatisch ergänzt.
      </p>

      <form
        action={(fd) =>
          start(async () => {
            const r = await importResourcesFromUpload(fd);
            setResult(r.message);
          })
        }
        className="space-y-3 rounded-lg border bg-white p-4"
      >
        <input type="file" name="file" accept=".xlsx,.xls" required className="text-sm" />
        <div>
          <Button type="submit" disabled={pending}>
            {pending ? "Importiere …" : "Import starten"}
          </Button>
        </div>
      </form>

      {result && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{result}</p>
      )}
    </div>
  );
}

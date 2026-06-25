"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendCollection } from "@/lib/actions/collections";
import { Button, Field, Input, Textarea } from "./ui";

export function CollectionSendForm({
  collectionId,
  defaultTo,
  defaultSubject,
}: {
  collectionId: string;
  defaultTo?: string;
  defaultSubject: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [to, setTo] = useState(defaultTo ?? "");
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState(
    "Guten Tag\n\nanbei der Sammelrapport als PDF.\n\nFreundliche Grüsse\nGandola & Battaini AG"
  );
  const [result, setResult] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <Field label="Empfänger (Komma-getrennt)">
        <Input value={to} onChange={(e) => setTo(e.target.value)} />
      </Field>
      <Field label="Betreff">
        <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
      </Field>
      <Field label="Nachricht">
        <Textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
      </Field>
      <Button
        disabled={pending || !to}
        onClick={() =>
          start(async () => {
            const r = await sendCollection(collectionId, to, subject, message);
            setResult(r.status === "GESENDET" ? "✓ Versendet (bzw. Dry-Run)." : `Fehler: ${r.fehler}`);
            router.refresh();
          })
        }
      >
        {pending ? "Senden …" : "Mit PDF senden"}
      </Button>
      {result && <p className="text-sm text-neutral-600">{result}</p>}
    </div>
  );
}

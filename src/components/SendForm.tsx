"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendReport } from "@/lib/actions/reports";
import { Button, Field, Input, Textarea } from "./ui";

export function SendForm({
  reportId,
  defaultTo,
  defaultSubject,
}: {
  reportId: string;
  defaultTo?: string;
  defaultSubject: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [to, setTo] = useState(defaultTo ?? "");
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState(
    "Guten Tag\n\nanbei senden wir Ihnen den Regiebericht als PDF.\n\nFreundliche Grüsse\nGandola & Battaini AG"
  );
  const [result, setResult] = useState<string | null>(null);

  function submit() {
    setResult(null);
    start(async () => {
      const r = await sendReport(reportId, to, subject, message);
      setResult(
        r.status === "GESENDET"
          ? "✓ Versendet (bzw. im Dry-Run protokolliert)."
          : `Fehler: ${r.fehler}`
      );
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <Field label="Empfänger (mehrere mit Komma trennen)">
        <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="kunde@example.ch" />
      </Field>
      <Field label="Betreff">
        <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
      </Field>
      <Field label="Nachricht">
        <Textarea rows={5} value={message} onChange={(e) => setMessage(e.target.value)} />
      </Field>
      <Button onClick={submit} disabled={pending || !to}>
        {pending ? "Senden …" : "Mit PDF senden"}
      </Button>
      {result && <p className="text-sm text-neutral-600">{result}</p>}
    </div>
  );
}

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
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    start(async () => {
      try {
        const r = await sendReport(reportId, to, subject, message);
        if (r.status === "GESENDET") {
          // Erfolg → Status ist 'Gesendet', zurück zur Übersicht mit Meldung
          router.push("/dashboard?sent=1");
          router.refresh();
        } else {
          setError(r.fehler ?? "Versand fehlgeschlagen.");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Versand fehlgeschlagen.");
      }
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
        {pending ? "Senden … (PDF wird erstellt)" : "Mit PDF senden"}
      </Button>
      {error && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          Versand fehlgeschlagen: {error}
        </p>
      )}
    </div>
  );
}

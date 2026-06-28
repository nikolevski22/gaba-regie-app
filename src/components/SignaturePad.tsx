"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveSignature, clearSignature } from "@/lib/actions/reports";
import { Button, Input } from "./ui";

export function SignaturePad({
  reportId,
  signed,
  signedName,
  signedAt,
}: {
  reportId: string;
  signed?: string | null;
  signedName?: string | null;
  signedAt?: string | null;
}) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const dirty = useRef(false);
  const [name, setName] = useState(signedName ?? "");
  const [editing, setEditing] = useState(!signed);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#111";
  }, [editing]);

  function pos(e: React.PointerEvent) {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * c.width,
      y: ((e.clientY - r.top) / r.height) * c.height,
    };
  }
  function down(e: React.PointerEvent) {
    e.preventDefault();
    drawing.current = true;
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  }
  function move(e: React.PointerEvent) {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = pos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    dirty.current = true;
  }
  function up() {
    drawing.current = false;
  }
  function clearCanvas() {
    const c = canvasRef.current!;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    dirty.current = false;
  }

  function save() {
    if (!dirty.current) {
      setMsg("Bitte zuerst unterschreiben.");
      return;
    }
    const dataUrl = canvasRef.current!.toDataURL("image/png");
    start(async () => {
      await saveSignature(reportId, dataUrl, name);
      setEditing(false);
      setMsg(null);
      router.refresh();
    });
  }

  if (!editing && signed) {
    return (
      <div className="rounded-lg border bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold">Unterschrift Bauherrschaft</h2>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={signed} alt="Unterschrift" className="h-24 rounded border bg-white p-1" />
        <p className="mt-2 text-sm text-neutral-600">
          {signedName ? <strong>{signedName}</strong> : null}
          {signedAt ? ` · ${new Date(signedAt).toLocaleString("de-CH")}` : null}
        </p>
        <button
          onClick={() => start(async () => { await clearSignature(reportId); setEditing(true); router.refresh(); })}
          className="mt-2 text-xs text-neutral-500 hover:text-red-600"
        >
          Unterschrift entfernen / neu erfassen
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-white p-4">
      <h2 className="mb-2 text-sm font-semibold">Unterschrift Bauherrschaft</h2>
      <p className="mb-2 text-xs text-neutral-500">
        Mit Finger (Handy/Tablet) oder Maus im Feld unterschreiben.
      </p>
      <canvas
        ref={canvasRef}
        width={500}
        height={170}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerLeave={up}
        style={{ touchAction: "none" }}
        className="w-full max-w-md rounded border bg-neutral-50"
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name Unterzeichner"
          className="w-56"
        />
        <Button onClick={save} disabled={pending}>
          {pending ? "Speichern …" : "Unterschrift speichern"}
        </Button>
        <Button variant="secondary" onClick={clearCanvas} type="button">
          Löschen
        </Button>
      </div>
      {msg && <p className="mt-2 text-sm text-amber-600">{msg}</p>}
    </div>
  );
}

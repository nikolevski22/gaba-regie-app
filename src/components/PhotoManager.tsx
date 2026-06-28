"use client";

import { useRef, useTransition } from "react";
import { uploadPhotos, removePhoto } from "@/lib/actions/reports";

export function PhotoManager({
  reportId,
  photos,
}: {
  reportId: string;
  photos: { id: string; name: string }[];
}) {
  const [pending, start] = useTransition();
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append("photos", f));
    start(async () => {
      await uploadPhotos(reportId, fd);
    });
  }

  return (
    <div className="rounded-lg border bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold">Baustellenfotos</h2>

      <div className="mb-4 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
        {photos.map((p) => (
          <div key={p.id} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/photos/${p.name}`}
              alt=""
              className="aspect-square w-full rounded border object-cover"
            />
            <form action={removePhoto.bind(null, p.id)}>
              <button
                className="absolute right-1 top-1 rounded-full bg-white/90 px-1.5 text-xs text-red-600 shadow"
                title="Löschen"
              >
                ✕
              </button>
            </form>
          </div>
        ))}
        {photos.length === 0 && (
          <p className="col-span-full text-sm text-neutral-400">Noch keine Fotos.</p>
        )}
      </div>

      {/* Versteckte Inputs: Kamera (capture) und Galerie */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => cameraRef.current?.click()}
          className="rounded-md bg-gaba px-4 py-2 text-sm font-medium text-white hover:bg-gaba-dark disabled:opacity-50"
        >
          📷 Foto aufnehmen
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => galleryRef.current?.click()}
          className="rounded-md border px-4 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50"
        >
          🖼 Aus Galerie
        </button>
        {pending && <span className="self-center text-sm text-neutral-400">Lade hoch …</span>}
      </div>
    </div>
  );
}

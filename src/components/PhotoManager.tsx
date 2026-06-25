import { uploadPhotos, removePhoto } from "@/lib/actions/reports";
import { Button } from "./ui";

export function PhotoManager({
  reportId,
  photos,
}: {
  reportId: string;
  photos: { id: string; name: string }[];
}) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold">Baustellenfotos</h2>

      <div className="mb-4 flex flex-wrap gap-3">
        {photos.map((p) => (
          <div key={p.id} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/photos/${p.name}`}
              alt=""
              className="h-28 w-28 rounded border object-cover"
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
          <p className="text-sm text-neutral-400">Noch keine Fotos.</p>
        )}
      </div>

      <form action={uploadPhotos.bind(null, reportId)} className="flex items-center gap-2">
        <input
          type="file"
          name="photos"
          accept="image/*"
          multiple
          className="text-sm"
        />
        <Button type="submit" variant="secondary">
          Hochladen
        </Button>
      </form>
    </div>
  );
}

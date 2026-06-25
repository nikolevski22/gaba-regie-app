import { readPhoto } from "@/lib/storage";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  const buf = await readPhoto(name);
  if (!buf) return new Response("Not found", { status: 404 });
  const ext = name.split(".").pop()?.toLowerCase() === "png" ? "png" : "jpeg";
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": `image/${ext}`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}

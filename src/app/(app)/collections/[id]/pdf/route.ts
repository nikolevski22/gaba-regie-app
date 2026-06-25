import { buildCollectionPdf } from "@/lib/actions/collections";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const pdf = await buildCollectionPdf(id);
  if (!pdf) return new Response("Not found", { status: 404 });
  const download = new URL(req.url).searchParams.get("download") === "1";
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="Sammelrapport_${id}.pdf"`,
    },
  });
}

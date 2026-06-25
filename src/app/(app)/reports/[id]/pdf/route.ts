import { generatePdf } from "@/lib/actions/reports";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const pdf = await generatePdf(id);
  if (!pdf) return new Response("Not found", { status: 404 });

  const { searchParams } = new URL(req.url);
  const download = searchParams.get("download") === "1";

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="Regiebericht_${id}.pdf"`,
    },
  });
}

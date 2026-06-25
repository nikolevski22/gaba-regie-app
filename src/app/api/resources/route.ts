/** Such-API für den Artikel-Picker im Rapport-Formular. */
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const kategorie = searchParams.get("kategorie") ?? undefined;

  const results = await prisma.resource.findMany({
    where: {
      aktiv: true,
      ...(kategorie ? { kategorie: kategorie as never } : {}),
      ...(q
        ? {
            OR: [
              { bezeichnung: { contains: q, mode: "insensitive" } },
              { artikelNr: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: [{ bezeichnung: "asc" }],
    take: 25,
  });

  return Response.json(
    results.map((r) => ({
      id: r.id,
      artikelNr: r.artikelNr,
      bezeichnung: r.bezeichnung,
      kategorie: r.kategorie,
      einheit: r.einheit,
      preis: Number(r.preis),
    }))
  );
}

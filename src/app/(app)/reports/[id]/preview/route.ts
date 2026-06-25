/**
 * Sofort-Vorschau als HTML (ohne Playwright) — identisches Layout wie das PDF,
 * aber sofort sichtbar. Playwright wird nur für den echten PDF-Download/Versand
 * verwendet.
 */
import { buildPdfReport } from "@/lib/report-data";
import { renderReportHtml } from "@/lib/pdf-template";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const model = await buildPdfReport(id);
  if (!model) return new Response("Not found", { status: 404 });
  const html = renderReportHtml(model);
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

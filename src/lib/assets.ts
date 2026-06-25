/** Lädt Logo/Stempel als Base64-Data-URLs (für PDF-Einbettung). */
import fs from "node:fs";
import path from "node:path";

function toDataUrl(file: string): string | undefined {
  try {
    const p = path.join(process.cwd(), "public", file);
    const buf = fs.readFileSync(p);
    return `data:image/jpeg;base64,${buf.toString("base64")}`;
  } catch {
    return undefined;
  }
}

let _logo: string | undefined;
let _stamp: string | undefined;

export function logoDataUrl(): string | undefined {
  if (_logo === undefined) _logo = toDataUrl("logo.jpg") ?? "";
  return _logo || undefined;
}

export function stampDataUrl(): string | undefined {
  if (_stamp === undefined) _stamp = toDataUrl("stempel.jpg") ?? "";
  return _stamp || undefined;
}

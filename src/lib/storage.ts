/** Speicherung der Baustellenfotos auf einem persistenten Volume. */
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(process.cwd(), "uploads");

export async function ensureUploadDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

/** Speichert eine hochgeladene Datei und gibt den Dateinamen (= URL-Teil) zurück. */
export async function savePhoto(file: File): Promise<string> {
  await ensureUploadDir();
  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const name = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(UPLOAD_DIR, name), buf);
  return name;
}

export async function readPhoto(name: string): Promise<Buffer | null> {
  try {
    const safe = path.basename(name); // Path-Traversal verhindern
    return await fs.readFile(path.join(UPLOAD_DIR, safe));
  } catch {
    return null;
  }
}

export async function photoDataUrl(name: string): Promise<string | undefined> {
  const buf = await readPhoto(name);
  if (!buf) return undefined;
  const ext = name.split(".").pop()?.toLowerCase() === "png" ? "png" : "jpeg";
  return `data:image/${ext};base64,${buf.toString("base64")}`;
}

export async function deletePhoto(name: string): Promise<void> {
  try {
    await fs.unlink(path.join(UPLOAD_DIR, path.basename(name)));
  } catch {
    /* ignore */
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

/** Globale App-Einstellungen (Singleton). Legt Defaults an, falls fehlend. */
export async function getAppSettings() {
  return prisma.appSetting.upsert({
    where: { id: "singleton" },
    create: { id: "singleton" },
    update: {},
  });
}

/** Standard-MwSt-Satz lesen (als Dezimal, z. B. 0.081). */
export async function getDefaultMwst(): Promise<number> {
  const s = await getAppSettings();
  return Number(s.mwstPct);
}

export async function updateMwst(formData: FormData) {
  // Eingabe in Prozent (z. B. 8.1) -> Dezimal 0.081
  const prozent = Number(formData.get("mwstProzent") ?? 8.1);
  const mwstPct = prozent > 1 ? prozent / 100 : prozent;
  await prisma.appSetting.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", mwstPct },
    update: { mwstPct },
  });
  revalidatePath("/admin/settings");
}

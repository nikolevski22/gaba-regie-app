import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Rapport-Nr. aus Basis + Suffix zusammensetzen. */
export function rapportNr(basis?: string | null, suffix?: string | null): string {
  const b = (basis ?? "").trim();
  const s = (suffix ?? "").trim();
  if (b && s) return `${b}-${s}`;
  return b || s || "";
}

"use client";

import { useEffect } from "react";

/** Registriert den Service Worker → App wird auf Android als PWA installierbar. */
export function RegisterSW() {
  useEffect(() => {
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}

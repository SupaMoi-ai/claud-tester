"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    navigator.serviceWorker.register(`${basePath}/sw.js`).catch(() => {
      // Registration failures are non-fatal in Sprint 1.
    });
  }, []);
  return null;
}

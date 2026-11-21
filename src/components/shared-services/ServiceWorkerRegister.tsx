"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/faidatech-service-worker.js", { scope: "/" }).catch(() => undefined);
  }, []);
  return null;
}

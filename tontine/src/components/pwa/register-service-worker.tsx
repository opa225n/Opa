"use client";

import { useEffect } from "react";

export function RegisterServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Installation PWA non critique au fonctionnement du site : échec silencieux.
      });
    }
  }, []);

  return null;
}

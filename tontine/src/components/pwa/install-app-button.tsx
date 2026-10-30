"use client";

import { useEffect, useState } from "react";
import { Download, Share } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari n'expose pas display-mode: standalone de la même façon.
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandalone);
  const [isIos] = useState(
    () => typeof window !== "undefined" && /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase())
  );
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }
    function onAppInstalled() {
      setInstalled(true);
      setDeferredPrompt(null);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  if (installed) return null;

  async function handleInstallClick() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setInstalled(true);
      setDeferredPrompt(null);
      return;
    }
    if (isIos) {
      setShowIosHelp((v) => !v);
    }
  }

  // Ni invite Chrome/Android disponible, ni iOS détecté (ex: navigateur de bureau sans support) :
  // pas de bouton fonctionnel à proposer, on n'affiche rien plutôt qu'un bouton inutile.
  if (!deferredPrompt && !isIos) return null;

  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <button
        type="button"
        onClick={handleInstallClick}
        className="flex items-center gap-2 rounded-full border border-white/25 px-4 py-2 text-sm font-medium text-white/90 transition hover:bg-white/10"
      >
        <Download className="h-4 w-4" />
        Installer l&apos;application
      </button>
      {!deferredPrompt && isIos && showIosHelp && (
        <p className="max-w-xs text-xs text-white/70">
          Appuyez sur <Share className="inline h-3.5 w-3.5 -translate-y-0.5" aria-hidden /> « Partager »
          dans Safari, puis choisissez « Sur l&apos;écran d&apos;accueil ».
        </p>
      )}
    </div>
  );
}

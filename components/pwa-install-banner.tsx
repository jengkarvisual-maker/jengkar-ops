"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const DISMISS_KEY = "hari-ini-ngapain-install-dismissed";

function isIosDevice() {
  if (typeof window === "undefined") {
    return false;
  }

  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function isStandaloneMode() {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") {
      return true;
    }

    return window.localStorage.getItem(DISMISS_KEY) === "1";
  });
  const [isStandalone] = useState(() => isStandaloneMode());
  const [isIos] = useState(() => isIosDevice());

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setDismissed(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const canShowIosHint = useMemo(() => {
    return isIos && !isStandalone;
  }, [isIos, isStandalone]);

  const canShowInstallButton = useMemo(() => {
    return deferredPrompt !== null && !isStandalone;
  }, [deferredPrompt, isStandalone]);

  if (dismissed || (!canShowIosHint && !canShowInstallButton)) {
    return null;
  }

  async function handleInstall() {
    if (!deferredPrompt) {
      return;
    }

    await deferredPrompt.prompt();
    await deferredPrompt.userChoice.catch(() => undefined);
    setDeferredPrompt(null);
    setDismissed(true);
  }

  function handleDismiss() {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DISMISS_KEY, "1");
    }
    setDismissed(true);
  }

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-3xl border border-line bg-panel/95 p-4 shadow-[var(--shadow-soft)] backdrop-blur">
      <div className="flex items-start gap-3">
        <Image
          alt="Icon HARI INI NGAPAIN"
          className="mt-0.5 h-12 w-12 rounded-2xl border border-line object-cover"
          height={48}
          src="/icons/icon-192.png"
          width={48}
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            HARI INI NGAPAIN
          </p>
          {canShowInstallButton ? (
            <p className="mt-1 text-sm text-foreground">
              Pasang aplikasi ini ke handphone agar lebih cepat dibuka seperti app biasa.
            </p>
          ) : (
            <p className="mt-1 text-sm text-foreground">
              Di iPhone, buka Safari lalu pilih <strong>Bagikan</strong> dan{" "}
              <strong>Add to Home Screen</strong>.
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {canShowInstallButton ? (
              <button
                className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition active:translate-y-px active:scale-[0.99]"
                onClick={handleInstall}
                type="button"
              >
                Install
              </button>
            ) : null}
            <button
              className="rounded-full border border-line px-4 py-2 text-sm font-medium text-foreground transition active:translate-y-px active:scale-[0.99]"
              onClick={handleDismiss}
              type="button"
            >
              Nanti saja
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

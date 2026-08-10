"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type WakeLockSentinel = {
  release: () => Promise<void>;
};

type WakeLockNavigator = Navigator & {
  wakeLock?: {
    request: (type: "screen") => Promise<WakeLockSentinel>;
  };
};

function getNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }

  return Notification.permission;
}

function playAccessSound() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (
        window as Window &
          typeof globalThis & {
            webkitAudioContext?: typeof AudioContext;
          }
      ).webkitAudioContext;

    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();

    // Garante que o AudioContext não está suspenso (crucial quando a tela volta)
    if (ctx.state === "suspended") {
      void ctx.resume();
    }

    const beep = (offset: number, frequency: number, duration = 0.18) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = ctx.currentTime + offset;

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(0.28, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(start);
      oscillator.stop(start + duration);
    };

    beep(0, 740);
    beep(0.24, 980);
    beep(0.48, 740);

    window.setTimeout(() => {
      void ctx.close();
    }, 1000);
  } catch {}
}

function vibrateAccessAlert() {
  if ("vibrate" in navigator) {
    navigator.vibrate([250, 100, 250, 100, 400]);
  }
}

async function requestScreenWakeLock() {
  try {
    if (document.visibilityState !== "visible") return null;
    const wakeLock = (navigator as WakeLockNavigator).wakeLock;
    if (!wakeLock) return null;

    return await wakeLock.request("screen");
  } catch {
    return null;
  }
}

export function useTableAccessAlerts() {
  const [permission, setPermission] = useState(getNotificationPermission);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const enableAlerts = useCallback(async () => {
    if (typeof window === "undefined") return;

    if ("Notification" in window && Notification.permission === "default") {
      const nextPermission = await Notification.requestPermission();
      setPermission(nextPermission);
    } else {
      setPermission(getNotificationPermission());
    }

    wakeLockRef.current = await requestScreenWakeLock();
  }, []);

  useEffect(() => {
    function requestOnFirstInteraction() {
      void enableAlerts();
      window.removeEventListener("pointerdown", requestOnFirstInteraction);
      window.removeEventListener("keydown", requestOnFirstInteraction);
      window.removeEventListener("touchstart", requestOnFirstInteraction);
    }

    if (permission !== "default") return;

    window.addEventListener("pointerdown", requestOnFirstInteraction, {
      once: true,
    });
    window.addEventListener("keydown", requestOnFirstInteraction, {
      once: true,
    });
    window.addEventListener("touchstart", requestOnFirstInteraction, {
      once: true,
    });

    return () => {
      window.removeEventListener("pointerdown", requestOnFirstInteraction);
      window.removeEventListener("keydown", requestOnFirstInteraction);
      window.removeEventListener("touchstart", requestOnFirstInteraction);
    };
  }, [enableAlerts, permission]);

  useEffect(() => {
    async function refreshWakeLock() {
      if (document.visibilityState === "visible" && !wakeLockRef.current) {
        wakeLockRef.current = await requestScreenWakeLock();
      }
    }

    document.addEventListener("visibilitychange", refreshWakeLock);
    return () => {
      document.removeEventListener("visibilitychange", refreshWakeLock);
      void wakeLockRef.current?.release();
      wakeLockRef.current = null;
    };
  }, []);

  const notifyAccessRequest = useCallback(
    async (guestName: string, tableNumber?: number | string | null) => {
      playAccessSound();
      vibrateAccessAlert();

      if (!wakeLockRef.current) {
        wakeLockRef.current = await requestScreenWakeLock();
      }

      if ("Notification" in window && Notification.permission === "granted") {
        const tableLabel = tableNumber ? ` na mesa ${tableNumber}` : "";
        const notification = new Notification("Pedido de acesso à mesa", {
          body: `${guestName} quer entrar${tableLabel}.`,
          tag: "osdex-table-access",
          requireInteraction: true,
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      }
    },
    [],
  );

  return {
    accessAlertsEnabled: permission === "granted",
    accessAlertsPermission: permission,
    enableAccessAlerts: enableAlerts,
    notifyAccessRequest,
  };
}

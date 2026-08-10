"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { playNotificationSound as playSound, initSound } from "@/lib/sound";

export type NotificationType =
  | "new_order"
  | "order_ready"
  | "bill_requested"
  | "waiter_called"
  | "low_stock"
  | "order_cancelled"
  | "access_request";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  tableNumber?: number;
}

const SOUND_ENABLED_KEY = "osdex-sound-enabled";

const TYPE_CONFIG: Record<NotificationType, { icon: string; color: string }> = {
  new_order: { icon: "🍽️", color: "text-blue-400" },
  order_ready: { icon: "✅", color: "text-green-400" },
  bill_requested: { icon: "💳", color: "text-orange-400" },
  waiter_called: { icon: "🔔", color: "text-purple-400" },
  low_stock: { icon: "⚠️", color: "text-red-400" },
  order_cancelled: { icon: "❌", color: "text-red-400" },
  access_request: { icon: "🔑", color: "text-orange-400" },
};

function playNotificationSound() {
  playSound();
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem(SOUND_ENABLED_KEY);
    return stored === null ? true : stored === "true";
  });

  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;

  // Inicializa áudio no primeiro clique (autoplay policy)
  useEffect(() => {
    function handler() {
      initSound();
      document.removeEventListener("click", handler);
    }
    document.addEventListener("click", handler, { once: true });
  }, []);

  function toggleSound() {
    setSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem(SOUND_ENABLED_KEY, String(next));
      return next;
    });
  }

  const addNotification = useCallback(
    (
      type: NotificationType,
      title: string,
      message: string,
      tableNumber?: number,
    ) => {
      const notif: AppNotification = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        type,
        title,
        message,
        timestamp: new Date(),
        read: false,
        tableNumber,
      };

      setNotifications((prev) => [notif, ...prev].slice(0, 50));

      if (soundEnabledRef.current) {
        playNotificationSound();
      }
    },
    [],
  );

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function markRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }

  function clearAll() {
    setNotifications([]);
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    soundEnabled,
    toggleSound,
    addNotification,
    markAllRead,
    markRead,
    clearAll,
    typeConfig: TYPE_CONFIG,
  };
}

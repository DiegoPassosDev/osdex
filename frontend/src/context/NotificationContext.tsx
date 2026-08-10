"use client";

import {
  createContext,
  useContext,
  useCallback,
  useState,
  useRef,
  useEffect,
} from "react";
import { useAuthStore } from "@/store/auth.store";
import { useSocket } from "@/hooks/useSocket";
import { playBeepSound, initSound } from "@/lib/sound";
import { RESTAURANT_ID_FALLBACK } from "@/constants";

// ── Tipos ────────────────────────────────────────────────────────────────────

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

export const TYPE_CONFIG: Record<
  NotificationType,
  { icon: string; color: string }
> = {
  new_order: { icon: "🍽️", color: "text-blue-400" },
  order_ready: { icon: "✅", color: "text-green-400" },
  bill_requested: { icon: "💳", color: "text-orange-400" },
  waiter_called: { icon: "🔔", color: "text-purple-400" },
  low_stock: { icon: "⚠️", color: "text-red-400" },
  order_cancelled: { icon: "❌", color: "text-red-400" },
  access_request: { icon: "🔑", color: "text-orange-400" },
};

// ── Contexto ─────────────────────────────────────────────────────────────────

interface NotificationContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  soundEnabled: boolean;
  toggleSound: () => void;
  addNotification: (
    type: NotificationType,
    title: string,
    message: string,
    tableNumber?: number,
  ) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
  typeConfig: typeof TYPE_CONFIG;
}

const NotificationContext = createContext<NotificationContextValue | null>(
  null,
);

const SOUND_KEY = "osdex-sound-enabled";
const NOTIF_KEY = "osdex-notifications";

// ── Som ──────────────────────────────────────────────────────────────────────

function playSound() {
  playBeepSound();
}

// ── Provider ─────────────────────────────────────────────────────────────────

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { employee, restaurantId } = useAuthStore();

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(NOTIF_KEY);
      if (!raw) return [];
      const parsed: AppNotification[] = JSON.parse(raw);
      return parsed.map((n) => ({ ...n, timestamp: new Date(n.timestamp) }));
    } catch {
      return [];
    }
  });
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem(SOUND_KEY);
    return stored === null ? true : stored === "true";
  });

  const soundRef = useRef(soundEnabled);
  soundRef.current = soundEnabled;

  function toggleSound() {
    setSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem(SOUND_KEY, String(next));
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

      if (soundRef.current) playSound();
    },
    [],
  );

  function markRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function clearAll() {
    setNotifications([]);
    localStorage.removeItem(NOTIF_KEY);
  }

  // Persiste notificações no localStorage
  useEffect(() => {
    localStorage.setItem(NOTIF_KEY, JSON.stringify(notifications));
  }, [notifications]);

  // Inicializa áudio no primeiro clique (autoplay policy)
  useEffect(() => {
    function handler() {
      initSound();
      document.removeEventListener("click", handler);
    }
    document.addEventListener("click", handler, { once: true });
  }, []);

  // Só conecta o socket se for um funcionário (manager, waiter, kitchen…)
  // Clientes não recebem notificações globais
  const restId =
    employee?.restaurantId ||
    restaurantId ||
    RESTAURANT_ID_FALLBACK;

  useSocket(employee ? { type: "restaurant", id: restId } : null, {
    new_order: (order: any) => {
      addNotification(
        "new_order",
        "Novo Pedido",
        `Mesa ${order?.session?.table?.number ?? "?"} fez um pedido`,
        order?.session?.table?.number,
      );
    },
    order_status_updated: (order: any) => {
      if (order?.status === "READY") {
        addNotification(
          "order_ready",
          "Pedido Pronto",
          `Mesa ${order?.session?.table?.number ?? "?"} — pronto para entregar`,
          order?.session?.table?.number,
        );
      }
      if (order?.status === "CANCELLED") {
        addNotification(
          "order_cancelled",
          "Pedido Cancelado",
          `Mesa ${order?.session?.table?.number ?? "?"} cancelou um pedido`,
          order?.session?.table?.number,
        );
      }
    },
    bill_requested: (data: any) => {
      const tableNum = data?.table?.number ?? "?";
      addNotification(
        "bill_requested",
        "Conta Solicitada",
        `Mesa ${tableNum} está pedindo a conta`,
        data?.table?.number,
      );
    },
    waiter_called: (data: any) => {
      addNotification(
        "waiter_called",
        "Garçom Solicitado",
        `Mesa ${data?.tableNumber ?? "?"}: ${data?.reason ?? "Chamando garçom"}`,
        data?.tableNumber,
      );
    },
    table_access_requested: (data: any) => {
      addNotification(
        "access_request",
        "Solicitação de Acesso",
        `Mesa ${data?.tableNumber ?? "?"} — ${data?.guestName ?? "Cliente"} quer assumir a mesa`,
        data?.tableNumber,
      );
    },
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        soundEnabled,
        toggleSound,
        addNotification,
        markRead,
        markAllRead,
        clearAll,
        typeConfig: TYPE_CONFIG,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

// ── Hook de acesso ────────────────────────────────────────────────────────────

export function useNotificationContext() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error(
      "useNotificationContext deve ser usado dentro de NotificationProvider",
    );
  }
  return ctx;
}

"use client";

import { useState } from "react";
import { ItemTimer } from "@/components/ui/ItemTimer";
import { ExpandableText } from "@/components/ui/ExpandableText";
import { CheckCheck, Flame, Loader2, LogOut } from "lucide-react";
import Image from "next/image";
import { ThemeToggle } from "@/components/theme/ThemeProvider";
import { CustomToaster } from "@/components/ui/Toast";
import { LogoutConfirmModal } from "@/components/ui/LogoutConfirmModal";
import { useKitchenPage } from "./useKitchenPage";

export default function KitchenPage() {
  const p = useKitchenPage();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  if (!p.mounted) return null;

  const itemActions: Record<string, { label: string; next: string } | null> = {
    WAITING: { label: "Iniciar Preparo", next: "PREPARING" },
    PREPARING: { label: "Marcar Pronto", next: "READY" },
    READY: null,
  };

  const columns = [
    {
      title: "Aguardando",
      status: "WAITING",
      orders: p.waiting,
      color: "text-yellow-400",
      bg: "bg-yellow-500/10",
      border: "border-yellow-500/30",
      dot: "bg-yellow-400",
    },
    {
      title: "Em Preparo",
      status: "PREPARING",
      orders: p.preparing,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/30",
      dot: "bg-blue-400",
    },
    {
      title: "Pronto",
      status: "READY",
      orders: p.ready,
      color: "text-green-400",
      bg: "bg-green-500/10",
      border: "border-green-500/30",
      dot: "bg-green-400",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-900 p-4 md:p-6">
      <CustomToaster />

      {/* Header */}
      <div className="flex items-center justify-between mb-6 md:mb-8">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-orange-500 flex items-center justify-center shrink-0">
            <Image src="/icone-osdex.svg" alt="OSdex" width={36} height={36} className="w-9 h-9 md:w-10 md:h-10 brightness-0 invert" />
          </div>
          <div>
            <h1 className="text-base md:text-xl font-bold text-white">
              {p.employee?.role === "BAR" ? "Bar" : "Cozinha"} — OSdex
            </h1>
            <p className="text-gray-400 text-xs md:text-sm">
              Painel de pedidos em tempo real
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {p.loading && (
            <Loader2 className="w-5 h-5 text-orange-400 animate-spin" />
          )}
          <div className="flex items-center gap-2 bg-gray-800 px-3 py-2 md:px-4 rounded-xl">
            <Flame className="w-4 h-4 text-orange-400 shrink-0" />
            <span className="text-white text-xs md:text-sm font-medium">
              <span className="hidden sm:inline">
                {p.waiting.length + p.preparing.length} pedidos ativos
              </span>
              <span className="sm:hidden">
                {p.waiting.length + p.preparing.length} ativos
              </span>
            </span>
          </div>
          <ThemeToggle />
          <button
            onClick={() => setShowLogoutModal(true)}
            className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-gray-800 border border-gray-600 flex items-center justify-center text-gray-400 hover:bg-red-500/20 hover:text-red-400 transition-all"
            title="Sair"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Colunas Kanban */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {columns.map((col) => (
          <div key={col.status}>
            {/* Título da coluna */}
            <div
              className={`flex items-center gap-2 mb-3 md:mb-4 px-4 py-2.5 md:py-3 rounded-xl ${col.bg} border ${col.border}`}
            >
              <span
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${col.dot}`}
              />
              <span className={`font-semibold text-sm ${col.color}`}>
                {col.title}
              </span>
              <span
                className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${col.bg} ${col.color} border ${col.border}`}
              >
                {col.orders.length}
              </span>
            </div>

            {/* Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-3">
              {col.orders.length === 0 && (
                <div className="text-center py-10 md:py-12 text-gray-600 text-sm col-span-full">
                  Nenhum pedido
                </div>
              )}

              {col.orders.map((order) => {
                return (
                  <div
                    key={order.id}
                    className="bg-gray-800 rounded-2xl p-4 border border-gray-700"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center shrink-0">
                          <span className="text-orange-400 text-xs font-bold">
                            {order.session?.table?.number ?? "?"}
                          </span>
                        </div>
                        <span className="text-white font-semibold text-sm">
                          Mesa {order.session?.table?.number ?? "?"}
                        </span>
                      </div>
                    </div>

                    {/* Itens com ação individual */}
                    <div className="space-y-2 mb-4">
                      {order.items.map((item, i) => {
                        const action = itemActions[item.status];
                        return (
                          <div key={i} className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-md bg-gray-700 flex items-center justify-center text-gray-300 text-xs font-bold shrink-0">
                              {item.quantity}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-gray-100 text-sm font-medium leading-tight">
                                <ExpandableText text={item.menuItem?.name ?? "?"} maxLen={35} />
                                {item.notes && (
                                  <span className="text-orange-300/80 text-xs"> ⚠️ {item.notes}</span>
                                )}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <ItemTimer
                                date={order.createdAt}
                                prepTime={item.menuItem?.prepTimeMin ?? 10}
                                status={item.status}
                                statusChangedAt={item.statusChangedAt}
                              />
                              {action && (
                                <button
                                  onClick={() =>
                                    p.updateItemStatus(order.id, item.id, action.next)
                                  }
                                  className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
                                    action.next === "PREPARING"
                                      ? "bg-orange-500 hover:bg-orange-600 text-white"
                                      : "bg-green-500 hover:bg-green-600 text-white"
                                  }`}
                                >
                                  {action.label}
                                </button>
                              )}
                              {item.status === "READY" && (
                                <span className="shrink-0 text-xs text-green-400 font-medium flex items-center gap-1">
                                  <CheckCheck className="w-3.5 h-3.5" />
                                  Pronto
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <LogoutConfirmModal
        open={showLogoutModal}
        onCancel={() => setShowLogoutModal(false)}
        onConfirm={p.handleLogout}
      />
    </div>
  );
}

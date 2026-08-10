"use client";

import { Suspense, useId, useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ItemTimer } from "@/components/ui/ItemTimer";
import { useTablePage } from "./useTablePage";
import {
  ShoppingCart,
  Plus,
  Minus,
  X,
  Bell,
  ClipboardList,
  UtensilsCrossed,
  CheckCheck,
  Loader2,
  QrCode,
  LogOut,
  Camera,
  ChevronDown,
  User,
} from "lucide-react";
import { CustomToaster } from "@/components/ui/Toast";
import { SlideUpModal, useSlideUpClose } from "@/components/ui/SlideUpModal";
import { ORDER_STATUS_DOT, ORDER_STATUS_LABEL } from "@/types";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { ThemeToggle } from "@/components/theme/ThemeProvider";
import { BillRequestModal } from "./modal/BillRequestModal";
import { Receipt } from "lucide-react";
import {
  WaitingForAccessScreen,
  AccessDeniedScreen,
  AccessRequestModal,
} from "./TableAccessScreens";

const HEADER_HEIGHT = 72;

/* ─────────────────────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────────────────────── */
function getTableIdFromQrValue(value: string) {
  const decodedText = value.trim();
  try {
    const url = new URL(decodedText);
    const tableId = url.searchParams.get("tableId");
    if (tableId) return tableId;
    const [route, id] = url.pathname.split("/").filter(Boolean);
    if (route === "table" && id) return id;
  } catch {}
  return decodedText;
}

/* ─────────────────────────────────────────────────────────────────────────────
   QR Scanner
───────────────────────────────────────────────────────────────────────────── */
function QrScanner({ onScan }: { onScan: (tableId: string) => void }) {
  const reactId = useId();
  const containerId = `qr-reader-${reactId.replace(/:/g, "")}`;
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);

  useEffect(() => {
    let scanner: any;
    let started = false;
    let cancelled = false;

    function clearScannerDom() {
      document.getElementById(containerId)?.replaceChildren();
    }

    async function startScanner() {
      try {
        clearScannerDom();
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;
        scanner = new Html5Qrcode(containerId);
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decodedText: string) => {
            const tableId = getTableIdFromQrValue(decodedText);
            started = false;
            scanner.stop().catch(() => {});
            onScan(tableId);
          },
          () => {},
        );
        if (cancelled) {
          scanner.stop().catch(() => {});
          scanner.clear?.();
          clearScannerDom();
          return;
        }
        started = true;
        setStarting(false);
      } catch (err: any) {
        started = false;
        setError(
          err?.message?.toLowerCase().includes("permission")
            ? "Permissão de câmera negada. Permita o acesso nas configurações do browser."
            : "Não foi possível acessar a câmera.",
        );
        setStarting(false);
      }
    }

    startScanner();
    return () => {
      cancelled = true;
      if (started && scanner) {
        started = false;
        scanner
          .stop()
          .then(() => scanner.clear?.())
          .catch(() => {})
          .finally(clearScannerDom);
      } else {
        scanner?.clear?.();
        clearScannerDom();
      }
    };
  }, [containerId, onScan]);

  if (error) {
    return (
      <div className="w-full rounded-2xl bg-red-500/10 border border-red-500/30 p-4 text-center">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center gap-3">
      {starting && (
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Iniciando câmera...
        </div>
      )}
      <div
        id={containerId}
        className="mx-auto aspect-square w-[min(78vw,300px)] rounded-2xl overflow-hidden bg-black"
      />
      <p className="text-gray-500 text-xs text-center">
        Aponte para o QR Code da mesa
      </p>
    </div>
  );
}

/* ── Componentes internos dos modais ────────────────────────────────────── */
function CartContent({ p }: { p: ReturnType<typeof useTablePage> }) {
  const { close } = useSlideUpClose();

  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-bold text-white text-lg">Seu Pedido</h3>
        <button onClick={close}>
          <X className="w-5 h-5 text-gray-400" />
        </button>
      </div>
      <div className="space-y-3 mb-5">
        {p.cart.map((item) => (
          <div
            key={item.id}
            className="flex flex-col gap-2 pb-3 border-b border-gray-700 last:border-0"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => p.removeFromCart(item.id)}
                    className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center"
                  >
                    <Minus className="w-3 h-3 text-gray-300" />
                  </button>
                  <span className="text-sm font-bold text-white w-4 text-center">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => p.addToCart(item)}
                    className="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center"
                  >
                    <Plus className="w-3 h-3 text-orange-400" />
                  </button>
                </div>
                <span className="text-sm text-gray-300">{item.name}</span>
              </div>
              <span className="text-sm font-semibold text-white">
                R$ {(item.price * item.quantity).toFixed(2)}
              </span>
            </div>
            <input
              type="text"
              placeholder="Observação (ex: sem cebola)"
              value={item.notes || ""}
              onChange={(e) => p.updateNotes(item.id, e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-gray-700 border border-gray-600 text-gray-300 text-xs placeholder-gray-500 focus:outline-none focus:border-orange-500"
            />
          </div>
        ))}
      </div>
      <div className="border-t border-gray-700 pt-4 mb-5">
        <div className="flex justify-between">
          <span className="font-semibold text-gray-300">Total</span>
          <span className="font-bold text-orange-400 text-lg">
            R$ {p.cartTotal.toFixed(2)}
          </span>
        </div>
      </div>
      <Button
        icon={ShoppingCart}
        size="lg"
        className="w-full"
        loading={p.loadingOrder}
        onClick={p.confirmOrder}
      >
        Confirmar Pedido
      </Button>
    </>
  );
}

function TableProfileContent({ p }: { p: ReturnType<typeof useTablePage> }) {
  const { close } = useSlideUpClose();

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-bold text-white text-lg">Perfil</h3>
        <button onClick={close}>
          <X className="w-5 h-5 text-gray-400" />
        </button>
      </div>
      <div className="flex items-center gap-4 mb-6 p-4 bg-gray-700/50 rounded-2xl">
        <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center shrink-0">
          <span className="text-white font-bold">
            {p.guest?.name
              ?.split(" ")
              .map((n: string) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase() || "?"}
          </span>
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-white truncate">
            {p.guest?.name || "Cliente"}
          </p>
          <p className="text-xs text-gray-400 truncate">
            {p.guest?.email}
          </p>
        </div>
      </div>
      {p.hasTable && (
        <div className="flex items-center gap-3 mb-4 px-4 py-3 bg-gray-700/30 rounded-xl">
          <Image src="/icone-osdex.svg" alt="OSdex" width={14} height={14} className="w-5 h-5 shrink-0" />
          <p className="text-sm text-gray-300">
            Mesa{" "}
            <span className="font-semibold text-white">
              {p.tableNumber}
            </span>
          </p>
        </div>
      )}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-700/30 rounded-xl mb-4">
        <span className="text-sm text-gray-300">Tema</span>
        <ThemeToggle />
      </div>
      <button
        onClick={() => {
          close();
          setTimeout(() => p.setShowLogoutModal(true), 300);
        }}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 font-medium text-sm hover:bg-red-500/20 transition-all"
      >
        <LogOut className="w-4 h-4" />
        Sair da conta
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Página principal
───────────────────────────────────────────────────────────────────────────── */
function TablePageInner() {
  useRequireAuth("GUEST");
  const p = useTablePage(); // "p" de "props" — tudo vem do hook

  if (!p.hasHydrated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-orange-400 animate-spin" />
      </div>
    );
  }

// ── Sessão encerrada pelo gestor (prioridade máxima) ─────────────────────
  if (p.sessionClosedByManager) {
    return (
      <div className="min-h-screen bg-gray-900 w-full max-w-md mx-auto flex flex-col items-center justify-center px-8 gap-6">
        <CustomToaster />
        <div className="w-16 h-16 rounded-2xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center">
          <LogOut className="w-8 h-8 text-orange-400" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-bold text-white">Mesa encerrada</h3>
          <p className="text-gray-400 text-sm leading-relaxed mt-2">
            Esta mesa foi fechada. Voltando para o início em 5 segundos…
          </p>
        </div>
        <Loader2 className="w-5 h-5 text-orange-400 animate-spin" />
      </div>
    );
  }

// ── Aguardando autorização ────────────────────────────────────────────────
  if (p.waitingForAccess) {
    return <WaitingForAccessScreen ownerName={p.ownerName} />;
  }

// ── Tela de acesso negado ─────────────────────────────────────────────────
  if (p.accessDenied) {
    return (
      <AccessDeniedScreen
        onRetry={() => {
          p.setAccessDenied(false);
          p.setScanning(false);
        }}
      />
    );
  }

  // ── Tela de confirmação de mesa ───────────────────────────────────────────
  if (p.confirmed) {   

    return (
      <div className="min-h-screen bg-gray-900 w-full max-w-md mx-auto flex flex-col items-center justify-center gap-4 px-8">
        <div className="w-20 h-20 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center">
          <CheckCheck className="w-10 h-10 text-green-400" />
        </div>
        <h2 className="text-xl font-bold text-white">
          Mesa {p.tableNumber} confirmada!
        </h2>
        <p className="text-gray-400 text-sm text-center">
          Abrindo o cardápio...
        </p>
        <Loader2 className="w-5 h-5 text-orange-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 w-full max-w-md mx-auto relative">
      <CustomToaster />

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="bg-gray-900 border-b border-gray-800 sticky top-0 z-40 px-4 pt-4 pb-3">
        <div className="flex items-center justify-between relative">
          {/* Esquerda — saudação e mesa */}
          <div className="w-28 min-w-0">
            <p className="text-xs text-gray-400">
              {p.guest?.name ? `Olá, ${p.guest.name.split(" ")[0]}!` : "Olá!"}
            </p>
            <button
              onClick={() => !p.hasTable && p.setScanning(true)}
              className="flex items-center gap-1.5 mt-0.5"
            >
              <Image src="/icone-osdex.svg" alt="OSdex" width={12} height={12} className="w-4 h-4 shrink-0" />
              <span className="text-sm font-bold text-white truncate">
                {p.hasTable ? `Mesa ${p.tableNumber}` : "Selecione sua mesa"}
              </span>
              {!p.hasTable && (
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              )}
            </button>
          </div>

          {/* Centro — nome do restaurante */}
          <div className="flex-1 flex justify-center items-center min-w-0 px-2 ">
            {p.restaurantName && (
              <p className="text-sm font-bold text-orange-400 leading-tight  text-center justify-center">
                {p.restaurantName}
              </p>
            )}
          </div>

          {/* Direita — sino de notificações */}
          <div className="w-28 flex justify-end">
            <div ref={p.notifRef} className="relative shrink-0">
              <button
                onClick={p.handleToggleNotifications}
                className="relative w-9 h-9 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-all"
              >
                <Bell className="w-4 h-4" />
                {p.unreadNotifCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold leading-none">
                    {p.unreadNotifCount}
                  </span>
                )}
              </button>

              {p.showNotifications && (
                <div className="absolute right-0 top-11 w-72 bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
                    <p className="text-sm font-semibold text-white">
                      Atualizações
                    </p>
                    {p.orderNotifications.length > 0 && (
                      <button
                        onClick={p.clearNotifications}
                        className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                  {p.orderNotifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 gap-2">
                      <Bell className="w-8 h-8 text-gray-700" />
                      <p className="text-gray-500 text-xs">
                        Nenhuma atualização
                      </p>
                    </div>
                  ) : (
                    <div className="max-h-60 overflow-auto divide-y divide-gray-700/50">
                      {p.orderNotifications.map((n) => (
                        <div
                          key={n.id}
                          className="px-4 py-3 text-sm text-gray-300"
                        >
                          {n.message}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Sem mesa — convite para escanear ───────────────────────────── */}
      {p.hasTable &&
        !p.accessAlertsEnabled &&
        p.accessAlertsPermission !== "denied" && (
          <div className="px-4 pt-3">
            <button
              type="button"
              onClick={p.enableAccessAlerts}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-xs font-semibold text-orange-100 transition hover:bg-orange-500/20"
            >
              <Bell className="h-3.5 w-3.5" />
              Ativar alertas de acesso à mesa
            </button>
          </div>
        )}

      {!p.hasTable && !p.scanning && !p.loggingOut && (
        <div className="flex flex-col items-center justify-center px-6 pt-16 pb-32 gap-6">
          <div className="w-full bg-gray-800 border border-gray-700 rounded-3xl p-8 flex flex-col items-center gap-5 text-center">
            <div className="w-20 h-20 rounded-3xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center">
              <QrCode className="w-10 h-10 text-orange-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white mb-2">
                Bem-vindo ao OSdex!
              </h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                Para acessar o cardápio e fazer pedidos, escaneie o QR Code
                disponível na sua mesa.
              </p>
            </div>
            <button
              onClick={() => p.setScanning(true)}
              disabled={p.identifyingTable}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-semibold text-sm transition-all disabled:opacity-60"
            >
              {p.identifyingTable ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
              {p.identifyingTable
                ? "Identificando mesa..."
                : "Escanear QR Code"}
            </button>
          </div>
          <div className="w-full flex flex-col gap-2">
            {[
              {
                icon: "📍",
                text: "O QR Code está na mesa do restaurante",
              },
              {
                icon: "📷",
                text: "Permita o acesso à câmera quando solicitado",
              },
              {
                icon: "🛒",
                text: "Após escanear, o cardápio abrirá automaticamente",
              },
            ].map((tip) => (
              <div
                key={tip.text}
                className="flex items-center gap-3 px-4 py-3 bg-gray-800/50 rounded-2xl border border-gray-700/50"
              >
                <span className="text-lg shrink-0">{tip.icon}</span>
                <p className="text-xs text-gray-400">{tip.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Scanner ─────────────────────────────────────────────────────── */}
      {!p.hasTable && p.scanning && !p.loggingOut && (
        <div className="flex flex-col items-center px-6 pt-8 pb-32 gap-5">
          <div className="text-center">
            <h2 className="text-lg font-bold text-white mb-1">
              Escaneie o QR Code
            </h2>
            <p className="text-gray-400 text-sm">
              Aponte a câmera para o código da mesa
            </p>
          </div>
          <QrScanner onScan={p.handleQrScan} />
          <button
            onClick={() => p.setScanning(false)}
            className="flex items-center gap-2 text-gray-500 text-sm hover:text-gray-300 transition-colors"
          >
            <X className="w-4 h-4" />
            Cancelar
          </button>
        </div>
      )}

      {/* ── Cardápio ───────────────────────────────────────────────────── */}
      {p.hasTable && p.tab === "menu" && (
        <div
          className={`w-full ${p.cartCount > 0 && !p.showCart ? "pb-36" : "pb-20"}`}
        >
          {p.loadingMenu ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 text-orange-400 animate-spin" />
            </div>
          ) : (
            <>
              <div
                className="sticky z-30 bg-gray-900 px-4 py-3 flex gap-2 overflow-x-auto scrollbar-hide"
                style={{ top: `${HEADER_HEIGHT}px` }}
              >
                {p.categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => p.setActiveCategory(cat.id)}
                    className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                      p.activeCategory === cat.id
                        ? "bg-orange-500 text-white"
                        : "bg-gray-800 text-gray-400 border border-gray-700"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              {p.categories
                .filter((cat) => cat.id === p.activeCategory)
                .map((cat) => (
                  <div key={cat.id} className="px-4 pt-2">
                    <div className="flex flex-col gap-3">
                      {cat.items.map((item) => {
                        const inCart = p.cart.find((c) => c.id === item.id);
                        return (
                          <div
                            key={item.id}
                            className={`bg-gray-800 rounded-2xl border p-4 flex items-start gap-3 ${
                              item.available
                                ? "border-gray-700"
                                : "border-gray-700 opacity-60"
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-white text-sm">
                                  {item.name}
                                </p>
                                {!item.available && (
                                  <span className="text-xs bg-red-500/15 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full">
                                    Indisponível
                                  </span>
                                )}
                              </div>
                              {item.description && (
                                <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                                  {item.description}
                                </p>
                              )}
                              <p className="text-orange-400 font-bold text-sm mt-2">
                                R$ {item.price.toFixed(2)}
                              </p>
                            </div>
                            {item.available && (
                              <div className="shrink-0">
                                {inCart ? (
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => p.removeFromCart(item.id)}
                                      className="w-7 h-7 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400"
                                    >
                                      <Minus className="w-3.5 h-3.5" />
                                    </button>
                                    <span className="text-sm font-bold text-white w-4 text-center">
                                      {inCart.quantity}
                                    </span>
                                    <button
                                      onClick={() => p.addToCart(item)}
                                      className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center text-white"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => p.addToCart(item)}
                                    className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white shadow-sm"
                                  >
                                    <Plus className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
            </>
          )}
        </div>
      )}

      {/* ── Meus Pedidos ───────────────────────────────────────────────── */}
      {p.hasTable && p.tab === "orders" && (
        <div
          className={`w-full px-4 py-4 ${p.cartCount > 0 && !p.showCart ? "pb-36" : "pb-20"}`}
        >
          <div className="flex flex-col gap-3">
            {p.orders.length === 0 && (
              <div className="text-center py-16">
                <ClipboardList className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Nenhum pedido ainda</p>
              </div>
            )}
            {p.orders.map((order) => (
              <div
                key={order.id}
                className="bg-gray-800 rounded-2xl border border-gray-700 p-4 w-full"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-gray-500">
                    {new Date(order.createdAt).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <StatusBadge status={order.status} />
                </div>
                <div className="space-y-1.5">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md bg-orange-500/20 flex items-center justify-center text-orange-400 text-xs font-bold shrink-0">
                        {item.quantity}
                      </span>
                      <span className="text-sm text-gray-300 flex-1 truncate">
                        {item.menuItem.name}
                      </span>
                      <ItemTimer
                        date={order.createdAt}
                        prepTime={item.menuItem?.prepTimeMin ?? 10}
                        status={item.status}
                        statusChangedAt={item.statusChangedAt}
                      />
                      <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-700/50 border border-gray-600/50 text-gray-400">
                        <span className={`w-1.5 h-1.5 rounded-full ${ORDER_STATUS_DOT[item.status]}`} />
                        {ORDER_STATUS_LABEL[item.status]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {/* Botão solicitar conta */}
            {!p.billRequested && (
              <div className="mt-2">
                <button
                  onClick={() => p.orders.length > 0 && p.setShowBillModal(true)}
                  disabled={p.orders.length === 0}
                  className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm transition-all ${
                    p.orders.length === 0
                      ? "bg-gray-700/30 border border-gray-600/50 text-gray-500 cursor-not-allowed"
                      : "bg-orange-500/10 border border-orange-500/30 text-orange-400 hover:bg-orange-500/20"
                  }`}
                >
                  <Receipt className="w-4 h-4" />
                  {p.orders.length > 0 ? "Solicitar a conta" : "Nenhum pedido ainda"}
                </button>
              </div>
            )}

            {p.billRequested && (
              <div className="mt-2">
                <div className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-green-500/10 border border-green-500/30 text-green-400 font-medium text-sm">
                  <CheckCheck className="w-4 h-4" />
                  Conta solicitada — aguarde o garçom
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Barra de navegação inferior ────────────────────────────────── */}
      {p.hasTable && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-40 bg-gray-900 border-t border-gray-800">
          <div className="flex items-stretch h-16">
            <button
              onClick={() => p.setTab("menu")}
              className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${p.tab === "menu" ? "text-orange-400" : "text-gray-500"}`}
            >
              <UtensilsCrossed className="w-5 h-5" />
              <span className="text-xs font-medium">Cardápio</span>
            </button>

            <button
              onClick={() => {
                p.setTab("orders");
                p.loadOrders();
              }}
              className={`flex-1 flex flex-col items-center justify-center gap-1 relative transition-colors ${p.tab === "orders" ? "text-orange-400" : "text-gray-500"}`}
            >
              <div className="relative">
                <ClipboardList className="w-5 h-5" />
                {p.activeOrders.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 px-0.5 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold leading-none">
                    {p.activeOrders.length}
                  </span>
                )}
              </div>
              <span className="text-xs font-medium">Pedidos</span>
            </button>

            <button
              onClick={p.handleCallWaiter}
              className="flex-1 flex flex-col items-center justify-center gap-1 text-purple-400"
            >
              <div className="w-10 h-10 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center -mt-5 shadow-lg">
                <Bell className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium mt-0.5">Garçom</span>
            </button>

            <button
              onClick={() => p.openProfileModal()}
              className="flex-1 flex flex-col items-center justify-center gap-1 text-gray-500"
            >
              <User className="w-5 h-5" />
              <span className="text-xs font-medium">Perfil</span>
            </button>
          </div>

          <div className="absolute top-0 left-0 right-0 flex pointer-events-none">
            <div
              className={`flex-1 h-0.5 transition-all duration-300 ${p.tab === "menu" ? "bg-orange-400" : "bg-transparent"}`}
            />
            <div
              className={`flex-1 h-0.5 transition-all duration-300 ${p.tab === "orders" ? "bg-orange-400" : "bg-transparent"}`}
            />
            <div className="flex-1 h-0.5 bg-transparent" />
            <div className="flex-1 h-0.5 bg-transparent" />
          </div>
        </div>
      )}

      {/* ── Carrinho flutuante ──────────────────────────────────────────── */}
      {p.cartCount > 0 && !p.showCart && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm">
          <button
            onClick={() => p.setShowCart(true)}
            className="w-full bg-orange-500 text-white rounded-2xl px-5 py-4 flex items-center justify-between shadow-lg shadow-orange-900/40"
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-xs font-bold">{p.cartCount}</span>
              </div>
              <span className="font-semibold text-sm">Ver carrinho</span>
            </div>
            <span className="font-bold">R$ {p.cartTotal.toFixed(2)}</span>
          </button>
        </div>
      )}

      {/* ── Modal carrinho ──────────────────────────────────────────────── */}
      {p.showCart && (
        <SlideUpModal onClose={() => p.setShowCart(false)} className="p-6 max-h-[80vh] overflow-auto">
          <CartContent p={p} />
        </SlideUpModal>
      )}

      {/* ── Modal perfil ────────────────────────────────────────────────── */}
      {p.profileModalState !== "closed" && (
        <SlideUpModal onClose={() => p.setProfileModalState("closed")}>
          <TableProfileContent p={p} />
        </SlideUpModal>
      )}

      {/* ── Overlay de logout ────────────────────────────────────────────── */}
      {p.loggingOut && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/80">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
            <p className="text-sm text-gray-400">Saindo...</p>
          </div>
        </div>
      )}

      {/* ── Modal logout ────────────────────────────────────────────────── */}
      {p.showLogoutModal && !p.loggingOut && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => p.setShowLogoutModal(false)}
          />
          <div className="relative w-full max-w-sm bg-gray-800 border border-gray-700 rounded-3xl p-6 flex flex-col gap-4">
            <div className="flex flex-col items-center text-center gap-2">
              <div className="w-14 h-14 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center mb-1">
                <LogOut className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-white">Encerrar sessão?</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Você precisará escanear o QR Code novamente para fazer novos
                pedidos.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => p.setShowLogoutModal(false)}
                className="flex-1 py-3 rounded-2xl bg-gray-700 border border-gray-600 text-gray-300 font-medium text-sm hover:bg-gray-600 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  p.setShowLogoutModal(false);
                  p.handleLogout();
                }}
                className="flex-1 py-3 rounded-2xl bg-red-500 hover:bg-red-600 active:bg-red-700 text-white font-medium text-sm transition-all"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal solicitar conta */}
      {p.showBillModal && (
        <BillRequestModal
          orders={p.orders}
          serviceCharge={p.serviceCharge}
          paymentMethod={p.paymentMethod}
          setPaymentMethod={p.setPaymentMethod}
          acceptService={p.acceptService}
          setAcceptService={p.setAcceptService}
          serviceChargeType={p.serviceChargeType}
          setServiceChargeType={p.setServiceChargeType}
          customServiceChargeAmount={p.customServiceChargeAmount}
          setCustomServiceChargeAmount={p.setCustomServiceChargeAmount}
          splitCount={p.splitCount}
          setSplitCount={p.setSplitCount}
          requesting={p.requestingBill}
          onConfirm={p.handleRequestBill}
          onClose={() => p.setShowBillModal(false)}
        />
      )}

      {p.incomingRequest && (
        <AccessRequestModal
          guestName={p.incomingRequest.guestName}
          onApprove={() => p.handleRespondAccess(true)}
          onDeny={() => p.handleRespondAccess(false)}
        />
      )}
    </div>
  );
}

export default function TablePage() {
  return (
    <Suspense fallback={null}>
      <TablePageInner />
    </Suspense>
  );
}

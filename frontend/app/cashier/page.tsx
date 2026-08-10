"use client";

import { useState } from "react";
import Image from "next/image";
import {
  DollarSign,
  CreditCard,
  Smartphone,
  Receipt,
  AlertCircle,
  CheckCheck,
  Loader2,
  X,
  Bell,
  LogOut,
  Wallet,
  UtensilsCrossed,
  BarChart3,
  CircleCheck,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeProvider";
import { CustomToaster } from "@/components/ui/Toast";
import { LogoutConfirmModal } from "@/components/ui/LogoutConfirmModal";
import { useCashierPage, METHOD_LABEL } from "./useCashierPage";

const PAYMENT_METHODS = [
  {
    value: "CASH",
    label: "Dinheiro",
    icon: DollarSign,
    color: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/30",
  },
  {
    value: "PIX",
    label: "Pix",
    icon: Smartphone,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
  },
  {
    value: "DEBIT",
    label: "Débito",
    icon: CreditCard,
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/30",
  },
  {
    value: "CREDIT",
    label: "Crédito",
    icon: CreditCard,
    color: "text-pink-400",
    bg: "bg-pink-500/10",
    border: "border-pink-500/30",
  },
  {
    value: "VOUCHER",
    label: "Vale Refeição",
    icon: Receipt,
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/30",
  },
  {
    value: "STORE_CREDIT",
    label: "Crédito do Cliente",
    icon: Wallet,
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
  },
];

export default function CashierPage() {
  const p = useCashierPage();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <CustomToaster />

      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 shrink-0 px-4 sm:px-6 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
              <Image src="/icone-osdex.svg" alt="OSdex" width={28} height={28} className="w-7 h-7 brightness-0 invert" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">Caixa — OSdex</p>
              <p className="text-xs text-gray-400">{p.employee?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/30">
              <span className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-green-400 text-sm font-semibold">
                Caixa aberto
              </span>
            </div>
            {p.billSessions.length > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium">
                <Bell className="w-3.5 h-3.5" />
                {p.billSessions.length} conta(s)
              </div>
            )}
            <ThemeToggle className="flex w-8 h-8 items-center justify-center rounded-lg border border-gray-600 bg-gray-700/50 text-gray-400 hover:text-orange-400 hover:bg-orange-500/20 hover:border-orange-500/30 transition-all" />
            <button
              onClick={() => setShowLogoutModal(true)}
              className="w-8 h-8 rounded-lg bg-gray-700/50 border border-gray-600 flex items-center justify-center text-gray-400 hover:text-red-400 transition-all"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto mt-2 grid grid-cols-3 border-b border-gray-700">
          {[
            {
              key: "sessions",
              label: "Mesas",
              icon: UtensilsCrossed,
              count: p.sessions.length,
            },
            {
              key: "debts",
              label: "Créditos",
              icon: Wallet,
              count: p.debts.length,
            },
            { key: "report", label: "Relatório", icon: BarChart3 },
          ].map((t) => {
            const Icon = t.icon;
            const active = p.tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => p.setTab(t.key as any)}
                className={`flex items-center justify-center gap-1.5 py-3 text-sm font-medium transition-all relative ${
                  active ? "text-gray-100" : "text-gray-500 hover:text-gray-300"
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
                {t.count !== undefined && t.count > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[11px] bg-orange-500/20 text-orange-400 font-semibold">
                    {t.count}
                  </span>
                )}
                {active && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div
        className={
          p.tab === "sessions"
            ? "flex-1 flex flex-col overflow-hidden px-4 sm:px-6"
            : "px-4 sm:px-6 py-6 overflow-y-auto"
        }
      >
        {p.loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
          </div>
        )}

        {/* Tab Mesas */}
        {!p.loading && p.tab === "sessions" && (
          <div className="flex-1 max-w-7xl mx-auto w-full pt-3 flex flex-col overflow-hidden">
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4 min-h-0">
            {/* ── Lista de mesas ── */}
            <div className="flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
              {p.billSessions.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" /> Pedindo Conta
                  </p>
                  {p.billSessions.map((session: any) => {
                    const total = p.getSessionTotal(session);
                    const selected = p.selectedSession?.id === session.id;
                    return (
                      <div
                        key={session.id}
                        onClick={() => p.handleSelectSession(session)}
                        className={`p-3 rounded-2xl border-2 cursor-pointer transition-all ${
                          selected
                            ? "border-orange-500 bg-orange-500/10"
                            : "border-red-500/50 bg-red-500/5 hover:border-red-500"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm ${
                                selected
                                  ? "bg-orange-500 text-white"
                                  : "bg-red-500/20 text-red-400"
                              }`}
                            >
                              {session.table?.number}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-white text-sm truncate">
                                Mesa {session.table?.number}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                <span className="font-semibold">Garçom:</span>{" "}
                                {session.waiter?.name || "Sem garçom"}
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-bold text-green-400 text-sm">
                              R$ {total.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}

              {p.openSessions.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-2">
                    Mesas Abertas
                  </p>
                  {p.openSessions.map((session: any) => {
                    const total = p.getSessionTotal(session);
                    const selected = p.selectedSession?.id === session.id;
                    return (
                      <div
                        key={session.id}
                        onClick={() => p.handleSelectSession(session)}
                        className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                          selected
                            ? "border-orange-500 bg-orange-500/10"
                            : "border-gray-700 bg-gray-800 hover:border-gray-500"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm ${
                                selected
                                  ? "bg-orange-500 text-white"
                                  : "bg-gray-700 text-gray-300"
                              }`}
                            >
                              {session.table?.number}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-white text-sm truncate">
                                Mesa {session.table?.number}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                <span className="font-semibold">Garçom:</span>{" "}
                                {session.waiter?.name || "Sem garçom"}
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-bold text-green-400 text-sm">
                              R$ {total.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}

              {p.sessions.length === 0 && (
                <div className="bg-gray-800 border border-gray-700 rounded-2xl flex flex-col items-center justify-center py-20">
                  <UtensilsCrossed className="w-10 h-10 text-gray-600 mb-3" />
                  <p className="text-gray-500 text-sm text-center px-4">
                    Nenhuma mesa aberta no momento
                  </p>
                </div>
              )}
              </div>

              {/* Rodapé — total geral */}
              {p.sessions.length > 0 && (
                <div className="shrink-0 pt-3 border-t border-gray-700 flex items-center justify-between px-1">
                  <span className="text-xs text-gray-500">Total em aberto</span>
                  <span className="text-sm font-bold text-green-400">
                    R$ {p.overallTotal.toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {/* ── Coluna central: consumo + totais ── */}
            <div className="min-w-0 min-h-0 overflow-y-auto flex flex-col">
              {!p.selectedSession ? (
                <div className="bg-gray-800 border border-gray-700 rounded-2xl flex flex-col items-center justify-center py-20 self-start w-full">
                  <Receipt className="w-10 h-10 text-gray-600 mb-3" />
                  <p className="text-gray-500 text-sm text-center px-4">
                    Selecione uma mesa
                  </p>
                </div>
              ) : p.loadingBill ? (
                <div className="bg-gray-800 border border-gray-700 rounded-2xl flex items-center justify-center py-20 self-start w-full">
                  <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
                </div>
              ) : (
                p.billData && (
                  <div className="bg-gray-800 border border-gray-700 rounded-2xl flex flex-col overflow-hidden w-full">
                    {/* Cabeçalho */}
                    <div className="flex items-center justify-between gap-4 py-2 px-4 border-b border-gray-700 shrink-0">
                      <div className="flex items-center gap-2">
                        <div className="h-6 rounded-lg bg-orange-500/20 border border-orange-500/30 flex items-center justify-center px-2">
                          <span className="text-orange-400 text-xs font-bold leading-none whitespace-nowrap">
                            Mesa {p.selectedSession.table?.number}
                          </span>
                        </div>
                        <span className="text-gray-500 text-sm">·</span>
                        <span className="text-white text-sm font-semibold truncate max-w-[140px]">
                          {p.selectedSession.guests?.[0]?.name ||
                            p.selectedSession.guestLabel}
                        </span>
                      </div>
                      <button
                        onClick={p.handleCloseSession}
                        className="w-7 h-7 rounded-lg bg-gray-700/50 border border-gray-700 flex items-center justify-center text-gray-400 hover:text-orange-400 hover:bg-orange-500/20 hover:border-orange-500/30 transition-all shrink-0"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    {/* Preferências */}
                    {(p.selectedSession?.bill?.preferredPaymentMethod ||
                      p.billData?.session?.bill?.preferredPaymentMethod) && (
                      <div className="px-4 py-2 border-b border-gray-700 flex items-center gap-4 text-xs shrink-0">
                        <span className="text-gray-400">
                          Preferência:{" "}
                          <span className="text-orange-400 font-medium">
                            {METHOD_LABEL[
                              p.selectedSession?.bill?.preferredPaymentMethod ||
                                p.billData?.session?.bill
                                  ?.preferredPaymentMethod
                            ] ||
                              p.selectedSession?.bill?.preferredPaymentMethod ||
                              p.billData?.session?.bill?.preferredPaymentMethod}
                          </span>
                        </span>
                        <span className="text-gray-400">
                          Taxa:{" "}
                          <span
                            className={
                              p.billData?.serviceCharge > 0
                                ? "text-green-400 font-medium"
                                : "text-gray-500"
                            }
                          >
                            {p.billData?.serviceCharge > 0
                              ? "Aceita"
                              : "Recusada"}
                          </span>
                        </span>
                      </div>
                    )}

                    {/* Conteúdo lado a lado */}
                    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                      {/* ── Esquerda: Consumo + Totais ── */}
                      <div className="flex-1 overflow-y-auto px-4 py-3 min-h-0">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                          Consumo ·
                          <span className="text-[10px] text-gray-500 font-normal normal-case">
                            {(() => {
                              let count = 0;
                              for (const order of p.billData.session?.orders ??
                                []) {
                                if (order.status === "CANCELLED") continue;
                                for (const item of order.items ?? [])
                                  count += item.quantity;
                              }
                              return `${count} itens`;
                            })()}
                          </span>
                        </p>
                        <div className="divide-y divide-gray-700/50">
                          {(() => {
                            const map = new Map<
                              string,
                              { name: string; quantity: number; price: number }
                            >();
                            for (const order of p.billData.session?.orders ??
                              []) {
                              if (order.status === "CANCELLED") continue;
                              for (const item of order.items ?? []) {
                                const key = `${item.menuItemId ?? item.menuItem?.id}-${item.price}`;
                                const existing = map.get(key);
                                if (existing) {
                                  existing.quantity += item.quantity;
                                } else {
                                  map.set(key, {
                                    name: item.menuItem?.name ?? "",
                                    quantity: item.quantity,
                                    price: item.price,
                                  });
                                }
                              }
                            }
                            return Array.from(map.values());
                          })().map((item, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between py-1.5"
                            >
                              <span
                                className="text-sm text-gray-300 truncate pr-2"
                                title={item.name}
                              >
                                {item.quantity}x {item.name}
                              </span>
                              <span className="text-sm text-gray-400 shrink-0">
                                R$ {(item.price * item.quantity).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Totais */}
                        <div className="mt-4 pt-3 border-t border-gray-700 space-y-1">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">
                              Subtotal
                            </span>
                            <span className="text-sm font-semibold text-gray-300">
                              R$ {p.billData.subtotal?.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">
                              Taxa ({p.billData.restaurant?.serviceCharge}%)
                            </span>
                            <span className="text-sm font-semibold text-gray-300">
                              R$ {p.billData.serviceCharge?.toFixed(2)}
                            </span>
                          </div>
                          {p.discountVal > 0 && (
                            <div className="flex justify-between">
                              <span className="text-sm text-green-500">
                                Desconto
                              </span>
                              <span className="text-sm font-semibold text-green-500">
                                - R$ {p.discountVal.toFixed(2)}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between text-sm font-bold pt-1.5 border-t border-gray-700">
                            <span className="text-white">Total</span>
                            <span className="text-green-400">
                              R$ {p.finalAmount.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* ── Divider vertical ── */}
                      <div className="hidden lg:block w-px bg-gray-700 shrink-0" />

                      {/* ── Direita: Pagamento ── */}
                      <div className="w-full lg:w-[340px] overflow-y-auto px-4 py-3 shrink-0 space-y-3 min-h-0">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-3">
                          Pagamento
                        </span>

                        {/* Métodos de pagamento */}
                        <div>
                          <label className="text-xs font-medium text-gray-400 mb-1.5 block">
                            Forma de Pagamento
                          </label>
                          <div className="grid grid-cols-2 gap-1.5">
                            {PAYMENT_METHODS.map((m) => {
                              const Icon = m.icon;
                              const sel = p.method === m.value;
                              return (
                                <button
                                  key={m.value}
                                  onClick={() => p.setMethod(m.value)}
                                  className={`flex items-center gap-1.5 p-2 rounded-xl border text-xs font-medium transition-all ${
                                    sel
                                      ? `${m.bg} ${m.border} ${m.color} font-semibold`
                                      : "bg-gray-800/50 border-gray-600/50 text-gray-400 hover:border-gray-500"
                                  }`}
                                >
                                  <Icon className="w-3.5 h-3.5 shrink-0" />
                                  <span className="truncate leading-tight">
                                    {m.label}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* PIN STORE_CREDIT */}
                        {p.method === "STORE_CREDIT" && (
                          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                            <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                            <input
                              type="password"
                              placeholder="PIN de autorização"
                              value={p.authPin}
                              onChange={(e) => p.setAuthPin(e.target.value)}
                              className="flex-1 px-2 py-1.5 rounded-lg bg-gray-800 border border-red-500/30 text-white text-xs focus:outline-none focus:border-red-500 placeholder:text-gray-500"
                            />
                          </div>
                        )}

                        {/* Desconto + Recebido */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs font-medium text-gray-500 mb-1 block">
                              Desconto (R$)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              placeholder="0,00"
                              value={p.discount}
                              onChange={(e) => p.setDiscount(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg bg-gray-700/50 border border-gray-600/50 text-white text-sm focus:outline-none focus:border-orange-500 placeholder:text-gray-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </div>
                          {p.method === "CASH" && (
                            <div>
                              <label className="text-xs font-semibold text-gray-300 mb-1 block">
                                Recebido (R$)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                placeholder="0,00"
                                value={p.cashReceived}
                                onChange={(e) =>
                                  p.setCashReceived(e.target.value)
                                }
                                className="w-full px-3 py-2 rounded-lg bg-gray-700/50 border border-gray-600/50 text-white text-sm focus:outline-none focus:border-orange-500 placeholder:text-gray-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                            </div>
                          )}
                        </div>

                        {/* Troco */}
                        {p.method === "CASH" && p.change > 0 && (
                          <div className="flex items-center justify-between bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2">
                            <span className="text-sm text-gray-300">Troco</span>
                            <span className="text-base font-bold text-green-400">
                              R$ {p.change.toFixed(2)}
                            </span>
                          </div>
                        )}

                        {/* Observação */}
                        <div>
                          <label className="text-xs font-medium text-gray-500 mb-1 block">
                            Observação
                          </label>
                          <input
                            placeholder="Opcional"
                            value={p.notes}
                            onChange={(e) => p.setNotes(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-gray-700/50 border border-gray-600/50 text-white text-sm focus:outline-none focus:border-orange-500 placeholder:text-gray-600"
                          />
                        </div>

                        {/* Botão confirmar */}
                        <button
                          onClick={p.handlePayment}
                          disabled={p.processing}
                          className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-lg shadow-orange-900/30"
                        >
                          {p.processing ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CircleCheck className="w-4 h-4" />
                          )}
                          {p.processing
                            ? "Processando..."
                            : `Confirmar — R$ ${p.finalAmount.toFixed(2)}`}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
          </div>
        )}

        {/* Tab Créditos */}
        {!p.loading && p.tab === "debts" && (
          <div className="max-w-2xl">
            <p className="text-sm text-gray-400 mb-4">
              Clientes com saldo devedor (Crédito do Cliente)
            </p>
            {p.debts.length === 0 && (
              <div className="text-center py-16 bg-gray-800 border border-gray-700 rounded-2xl">
                <CheckCheck className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Nenhum saldo devedor</p>
              </div>
            )}
            <div className="space-y-3">
              {p.debts.map((debt: any) => (
                <div
                  key={debt.id}
                  className="bg-gray-800 border border-gray-700 rounded-2xl p-4"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="font-semibold text-white">
                        {debt.guest?.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {debt.guest?.phone || debt.guest?.email}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-gray-500">Saldo devedor</p>
                      <p className="text-lg font-bold text-red-400">
                        R$ {debt.balance.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                    <span>Total: R$ {debt.totalDebt.toFixed(2)}</span>
                    <span>Pago: R$ {debt.paidAmount.toFixed(2)}</span>
                  </div>
                  <button
                    onClick={() => p.handlePayDebt(debt.id, debt.balance)}
                    className="w-full py-2 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm font-medium hover:bg-green-500/20 transition-all"
                  >
                    Registrar Pagamento
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab Relatório */}
        {!p.loading && p.tab === "report" && p.report && (
          <div className="max-w-2xl space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4">
                <p className="text-xs text-gray-400 mb-1">Total do Dia</p>
                <p className="text-xl font-bold text-green-400">
                  R$ {p.report.totalRevenue?.toFixed(2)}
                </p>
              </div>
              <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4">
                <p className="text-xs text-gray-400 mb-1">Em Dinheiro</p>
                <p className="text-xl font-bold text-white">
                  R$ {p.report.totalCash?.toFixed(2)}
                </p>
              </div>
              <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4">
                <p className="text-xs text-gray-400 mb-1">Digital/Cartão</p>
                <p className="text-xl font-bold text-blue-400">
                  R$ {p.report.totalDigital?.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Por forma de pagamento */}
            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5">
              <p className="text-sm font-semibold text-white mb-4">
                Por Forma de Pagamento
              </p>
              <div className="space-y-3">
                {Object.entries(p.report.byMethod || {}).map(
                  ([method, amount]: any) => {
                    if (amount === 0) return null;
                    const pct =
                      p.report.totalRevenue > 0
                        ? (amount / p.report.totalRevenue) * 100
                        : 0;
                    const m = PAYMENT_METHODS.find((pm) => pm.value === method);
                    return (
                      <div key={method}>
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={`text-sm ${m?.color || "text-gray-300"}`}
                          >
                            {METHOD_LABEL[method]}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-500">
                              {pct.toFixed(1)}%
                            </span>
                            <span className="text-sm font-bold text-white">
                              R$ {amount.toFixed(2)}
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${m?.bg?.replace("/10", "") || "bg-gray-500"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            </div>

            {/* Histórico */}
            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5">
              <p className="text-sm font-semibold text-white mb-4">
                Pagamentos de Hoje ({p.report.count})
              </p>
              {p.report.payments?.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-4">
                  Nenhum pagamento hoje
                </p>
              )}
              <div className="space-y-2">
                {p.report.payments?.map((payment: any) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between py-2 border-b border-gray-700 last:border-0"
                  >
                    <div>
                      <p className="text-sm text-gray-200">
                        Mesa {payment.session?.table?.number}
                      </p>
                      <p className="text-xs text-gray-500">
                        {METHOD_LABEL[payment.method]} ·{" "}
                        {new Date(payment.createdAt).toLocaleTimeString(
                          "pt-BR",
                          { hour: "2-digit", minute: "2-digit" },
                        )}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-green-400">
                      R$ {payment.finalAmount?.toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      <LogoutConfirmModal
        open={showLogoutModal}
        onCancel={() => setShowLogoutModal(false)}
        onConfirm={p.handleLogout}
      />
    </div>
  );
}

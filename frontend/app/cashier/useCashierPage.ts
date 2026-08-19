"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { useSocket } from "@/hooks/useSocket";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/Toast";
import { useNotificationContext } from "@/context/NotificationContext";
import { RESTAURANT_ID_FALLBACK } from "@/constants";

export const METHOD_LABEL: Record<string, string> = {
  CASH: "Dinheiro", PIX: "Pix", DEBIT: "Débito", CREDIT: "Crédito",
  VOUCHER: "Vale Refeição", CHECK: "Cheque", STORE_CREDIT: "Crédito do Cliente", MIXED: "Misto",
};

const METHOD_LABEL_PRINT: Record<string, string> = {
  CASH: "Dinheiro", PIX: "Pix", DEBIT: "Debito", CREDIT: "Credito",
  VOUCHER: "Vale Refeicao", CHECK: "Cheque", STORE_CREDIT: "Credito do Cliente", MIXED: "Misto",
};

const W = 32;
const DASH = "-".repeat(W);
const centerText = (s: string) => {
  if (s.length >= W) return s;
  return " ".repeat(Math.floor((W - s.length) / 2)) + s;
};
const lineText = (left: string, right: string) => {
  const maxLeft = W - right.length - 2;
  const truncated = left.length > maxLeft ? left.slice(0, maxLeft - 1) + "." : left;
  return truncated + " ".repeat(Math.max(1, W - truncated.length - right.length)) + right;
};

function buildReceiptHtml(
  restaurant: any,
  items: { name: string; quantity: number; price: number }[],
  pay: any,
  tableNumber: number | string,
) {
  const now = new Date(pay.createdAt);
  const dateStr = now.toLocaleDateString("pt-BR");
  const timeStr = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const methodLabel = METHOD_LABEL_PRINT[pay.method] ?? pay.method;

  let r = "";
  r += centerText((restaurant.name || "OSDEX").toUpperCase()) + "\n";
  if (restaurant.cnpj) r += centerText(`CNPJ: ${restaurant.cnpj}`) + "\n";
  if (restaurant.phone) r += centerText(`Tel: ${restaurant.phone}`) + "\n";
  r += DASH + "\n";
  r += centerText("COMPROVANTE DE PAGAMENTO") + "\n";
  r += DASH + "\n";
  r += `Mesa: ${tableNumber}` + "\n";
  r += `Data: ${dateStr} ${timeStr}` + "\n";
  r += `Pagamento: ${methodLabel}` + "\n";
  r += DASH + "\n";
  r += centerText("ITENS") + "\n";
  r += DASH + "\n";
  for (const it of items) {
    r += lineText(`${it.quantity}x ${it.name}`, `R$ ${(it.price * it.quantity).toFixed(2)}`) + "\n";
  }
  r += DASH + "\n";
  r += lineText("Subtotal", `R$ ${(pay.totalAmount ?? 0).toFixed(2)}`) + "\n";
  if (pay.serviceCharge > 0) r += lineText("Taxa de servico", `R$ ${pay.serviceCharge.toFixed(2)}`) + "\n";
  if (pay.discount > 0) r += lineText("Desconto", `- R$ ${pay.discount.toFixed(2)}`) + "\n";
  r += lineText("TOTAL", `R$ ${pay.finalAmount.toFixed(2)}`) + "\n";
  if (pay.method === "CASH" && pay.cashReceived) {
    r += lineText("Recebido", `R$ ${pay.cashReceived.toFixed(2)}`) + "\n";
    if (pay.change > 0) r += lineText("Troco", `R$ ${pay.change.toFixed(2)}`) + "\n";
  }
  r += DASH + "\n";
  r += centerText("Obrigado pela preferencia!") + "\n";
  r += "\n";

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Comprovante</title>
<style>
  @page { size: 58mm auto; margin: 0; }
  * { margin: 0; padding: 0; }
  body { font-family: 'Courier New', monospace; font-size: 12px; white-space: pre; color: #000; }
  .cut-space { height: 1cm; }
</style></head><body>${r}<div class="cut-space"></div>${DASH}\n</body></html>`;
}

function openPrintWindow(html: string) {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(html);
    doc.close();
    iframe.onload = () => {
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    };
  }
}

export function useCashierPage() {
  useRequireAuth("CASHIER");
  const { employee, clearAuth } = useAuthStore();
  const { clearAll } = useNotificationContext();
  const router = useRouter();
  const restaurantId = employee?.restaurantId || RESTAURANT_ID_FALLBACK;

  const [sessions, setSessions] = useState<any[]>([]);
  const [debts, setDebts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const processingRef = useRef(false);
  const [billData, setBillData] = useState<any>(null);
  const [loadingBill, setLoadingBill] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [tab, setTab] = useState<"sessions" | "debts" | "report">("sessions");
  const [report, setReport] = useState<any>(null);

  const [method, setMethod] = useState("CASH");
  const [discount, setDiscount] = useState("");
  const [cashReceived, setCashReceived] = useState("");
  const [notes, setNotes] = useState("");
  const [authPin, setAuthPin] = useState("");
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [lastReceiptData, setLastReceiptData] = useState<any>(null);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      const [sessionsRes, debtsRes, reportRes] = await Promise.all([
        api.get(`/payments/restaurant/${restaurantId}/pending`),
        api.get(`/payments/restaurant/${restaurantId}/debts`),
        api.get(`/payments/restaurant/${restaurantId}/report`),
      ]);
      setSessions(sessionsRes.data);
      setDebts(debtsRes.data);
      setReport(reportRes.data);
    } catch {
      toast.error("Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  const refreshSessionsSilent = useCallback(async () => {
    try {
      const [sessionsRes, debtsRes, reportRes] = await Promise.all([
        api.get(`/payments/restaurant/${restaurantId}/pending`),
        api.get(`/payments/restaurant/${restaurantId}/debts`),
        api.get(`/payments/restaurant/${restaurantId}/report`),
      ]);
      setSessions(sessionsRes.data);
      setDebts(debtsRes.data);
      setReport(reportRes.data);
    } catch {
      // silent
    }
  }, [restaurantId]);

  useEffect(() => {
    if (!restaurantId) return;
    loadAll();
  }, [restaurantId, loadAll]);

  // ── Fallback ao voltar do standby / polling periódico ─────────────────
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        refreshSessionsSilent();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    const interval = window.setInterval(refreshSessionsSilent, 30_000);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(interval);
    };
  }, [restaurantId, refreshSessionsSilent]);

  useSocket(
    { type: "restaurant", id: restaurantId },
    {
      bill_requested: () => {
        loadAll();
        toast("Mesa pedindo conta!", { icon: "🔔" });
      },
      new_order: () => loadAll(),
      table_session_updated: (data: any) => {
        if (data?.status === "CLOSED" && selectedSession?.id === data.id && !processingRef.current) {
          toast(`Mesa ${data?.table?.number ?? "?"} encerrada`, { icon: "🔒" });
          setSelectedSession(null);
          setBillData(null);
        }
        loadAll();
      },
    },
  );

  async function handleSelectSession(session: any) {
    setSelectedSession(session);
    setLoadingBill(true);
    setDiscount("");
    setCashReceived("");
    setNotes("");
    setAuthPin("");
    setMethod(session.bill?.preferredPaymentMethod || "CASH");
    try {
      const { data } = await api.get(`/payments/session/${session.id}/bill`);
      setBillData(data);
      if (data.session?.bill?.preferredPaymentMethod) {
        setMethod(data.session.bill.preferredPaymentMethod);
      }
    } catch {
      toast.error("Erro ao carregar conta.");
    } finally {
      setLoadingBill(false);
    }
  }

  function handleCloseSession() {
    setSelectedSession(null);
    setBillData(null);
  }

  async function handlePayment() {
    if (!selectedSession || !billData) return;
    if (method === "STORE_CREDIT" && !authPin) {
      toast.error("PIN de autorização obrigatório para Crédito do Cliente.");
      return;
    }

    const discountVal = parseFloat(discount) || 0;
    const finalAmount = billData.finalAmount - discountVal;
    const cashReceivedVal = parseFloat(cashReceived) || 0;

    if (method === "CASH" && cashReceivedVal > 0 && cashReceivedVal < finalAmount) {
      toast.error("Valor recebido menor que o total.");
      return;
    }

    setProcessing(true);
    processingRef.current = true;
    try {
      const { data: payment } = await api.post("/payments", {
        sessionId: selectedSession.id,
        restaurantId,
        cashierId: employee?.id,
        method,
        discount: discountVal,
        cashReceived: method === "CASH" && cashReceivedVal > 0 ? cashReceivedVal : undefined,
        notes: notes || undefined,
        authorizedBy: method === "STORE_CREDIT" ? authPin : undefined,
        printReceipt: false,
      });
      toast.success("Pagamento registrado! Mesa liberada.");
      setLastReceiptData({
        billData,
        session: selectedSession,
        payment,
      });
      setSelectedSession(null);
      setBillData(null);
      loadAll();
      setShowPrintDialog(true);
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Erro ao registrar pagamento.";
      toast.error(msg);
    } finally {
      setProcessing(false);
      processingRef.current = false;
    }
  }

  async function handlePrintChoice(print: boolean) {
    setShowPrintDialog(false);
    if (!print || !lastReceiptData) {
      setLastReceiptData(null);
      return;
    }

    const { billData: bd, session: ses, payment: pay } = lastReceiptData;

    let restaurant: any = {};
    try {
      const { data } = await api.get(`/restaurants/${restaurantId}`);
      restaurant = data;
    } catch { /* fallback to defaults */ }

    const itemMap = new Map<string, { name: string; quantity: number; price: number }>();
    for (const order of bd.session?.orders ?? []) {
      if (order.status === "CANCELLED") continue;
      for (const item of order.items ?? []) {
        const key = `${item.menuItem?.id}-${item.price}`;
        const existing = itemMap.get(key);
        if (existing) {
          existing.quantity += item.quantity;
        } else {
          itemMap.set(key, {
            name: item.menuItem?.name ?? "Item",
            quantity: item.quantity,
            price: item.price,
          });
        }
      }
    }

    openPrintWindow(buildReceiptHtml(restaurant, Array.from(itemMap.values()), pay, ses.table?.number ?? "?"));
    setLastReceiptData(null);
  }

  async function handleReprint(payment: any) {
    try {
      const [billRes, restRes] = await Promise.all([
        api.get(`/payments/session/${payment.sessionId}/bill`),
        api.get(`/restaurants/${restaurantId}`),
      ]);
      const bd = billRes.data;
      const restaurant = restRes.data;

      const itemMap = new Map<string, { name: string; quantity: number; price: number }>();
      for (const order of bd.session?.orders ?? []) {
        if (order.status === "CANCELLED") continue;
        for (const item of order.items ?? []) {
          const key = `${item.menuItem?.id}-${item.price}`;
          const existing = itemMap.get(key);
          if (existing) {
            existing.quantity += item.quantity;
          } else {
            itemMap.set(key, {
              name: item.menuItem?.name ?? "Item",
              quantity: item.quantity,
              price: item.price,
            });
          }
        }
      }

      openPrintWindow(buildReceiptHtml(restaurant, Array.from(itemMap.values()), payment, payment.session?.table?.number ?? "?"));
    } catch {
      toast.error("Erro ao buscar dados para reimpressão.");
    }
  }

  async function handlePayDebt(debtId: string, amount: number) {
    const amountStr = prompt(`Valor a pagar (saldo: R$ ${amount.toFixed(2)}):`);
    if (!amountStr) return;
    const amountVal = parseFloat(amountStr);
    if (isNaN(amountVal) || amountVal <= 0) {
      toast.error("Valor inválido.");
      return;
    }
    try {
      await api.post(`/payments/debts/${debtId}/pay`, {
        amount: amountVal,
        authorizedBy: employee?.id,
      });
      toast.success("Pagamento de dívida registrado!");
      loadAll();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Erro ao registrar pagamento.");
    }
  }

  function handleLogout() {
    clearAll();
    clearAuth();
    router.push("/login");
  }

  const discountVal = parseFloat(discount) || 0;
  const finalAmount = billData ? Math.max(0, billData.finalAmount - discountVal) : 0;
  const change = method === "CASH" && parseFloat(cashReceived) > 0
    ? Math.max(0, parseFloat(cashReceived) - finalAmount)
    : 0;

  const billSessions = sessions.filter((s: any) => s.status === "REQUESTING_BILL");
  const openSessions = sessions.filter((s: any) => s.status === "OPEN");

  function getSessionTotal(session: any): number {
    return (
      session.orders?.reduce((acc: number, o: any) => {
        if (o.status === "CANCELLED") return acc;
        return acc + o.items.reduce((s: number, i: any) => s + i.price * i.quantity, 0);
      }, 0) || 0
    );
  }

  function getSessionItemCount(session: any): number {
    return (
      session.orders?.reduce((acc: number, o: any) => {
        if (o.status === "CANCELLED") return acc;
        return acc + o.items.reduce((s: number, i: any) => s + i.quantity, 0);
      }, 0) || 0
    );
  }

  const overallTotal = sessions.reduce((acc, s) => acc + getSessionTotal(s), 0);

  return {
    employee,
    loading,
    tab, setTab,
    sessions,
    debts,
    report,
    selectedSession,
    billData,
    loadingBill,
    processing,
    method, setMethod,
    discount, setDiscount,
    cashReceived, setCashReceived,
    notes, setNotes,
    authPin, setAuthPin,
    discountVal,
    finalAmount,
    change,
    billSessions,
    openSessions,
    getSessionTotal,
    getSessionItemCount,
    overallTotal,
    handleSelectSession,
    handleCloseSession,
    handlePayment,
    handlePayDebt,
    handleLogout,
    showPrintDialog,
    setShowPrintDialog,
    handlePrintChoice,
    handleReprint,
  };
}

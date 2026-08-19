"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { toast } from "@/components/ui/Toast";

interface DiscoveredPrinter {
  ip: string;
  port: number;
  name: string;
}

export interface PrintComanda {
  printer: { id: string; name: string; ip: string; port: number };
  restaurantName: string;
  tableNumber: number;
  orderId: string;
  items: { name: string; quantity: number; notes?: string; category?: string }[];
  createdAt: string;
}

export interface PrintReceipt {
  printer: { id: string; name: string; ip: string; port: number };
  restaurantName: string;
  restaurantCnpj: string | null;
  restaurantAddress: string | null;
  restaurantPhone: string | null;
  tableNumber: number;
  orderId: string;
  type: 'RECEIPT';
  items: { name: string; quantity: number; price: number }[];
  subtotal: number;
  serviceCharge: number;
  discount: number;
  finalAmount: number;
  method: string;
  cashReceived: number | null;
  change: number | null;
  createdAt: string;
}

export type PrintJob = PrintComanda | PrintReceipt;

export function isReceipt(job: PrintJob): job is PrintReceipt {
  return 'type' in job && job.type === 'RECEIPT';
}

type PrintMode = "browser" | "network";

const STORAGE_KEY = "osdex_device_config";
const COMANDAS_KEY = "osdex_device_comandas";
const BATCH_SIZE = 20;
const SCAN_TIMEOUT = 300;

export function useDevicePage() {
  const [restaurantId, setRestaurantId] = useState("");
  const [location, setLocation] = useState("COZINHA");
  const [configured, setConfigured] = useState(false);
  const [printMode, setPrintMode] = useState<PrintMode>("browser");
  const [discovered, setDiscovered] = useState<DiscoveredPrinter[]>([]);
  const [scanning, setScanning] = useState(false);
  const [manualIp, setManualIp] = useState("");
  const [manualPort, setManualPort] = useState(9100);
  const [subnet, setSubnet] = useState("192.168.1");
  const [connected, setConnected] = useState(false);
  const [comandas, setComandas] = useState<PrintJob[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem(COMANDAS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const socketRef = useRef<Socket | null>(null);
  const missedJobsRef = useRef<PrintJob[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const config = JSON.parse(saved);
        setRestaurantId(config.restaurantId);
        setLocation(config.location);
        setPrintMode(config.printMode || "browser");
        setSubnet(config.subnet || "192.168.1");
        setConfigured(true);
      } catch {}
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(COMANDAS_KEY, JSON.stringify(comandas));
    } catch {}
  }, [comandas]);

  const connectSocket = useCallback(
    (restId: string) => {
      const token = localStorage.getItem("osdex_auth_token") || "";
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "/";

      const socket = io(wsUrl, {
        auth: { token },
        transports: ["polling"],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: Infinity,
      });

      socket.on("connect", () => {
        setConnected(true);
        missedJobsRef.current = [];
        socket.emit("join_device", {
          restaurantId: restId,
          location: location.toLowerCase(),
        });
      });

      socket.on("disconnect", () => {
        setConnected(false);
      });

      socket.on("reconnect", () => {
        setConnected(true);
        if (missedJobsRef.current.length > 0) {
          setComandas((prev) => {
            const merged = [...missedJobsRef.current, ...prev];
            missedJobsRef.current = [];
            return merged.slice(0, 50);
          });
          toast.success(`${missedJobsRef.current.length} comanda(s) recuperada(s).`);
        }
      });

      socket.on("join_device_success", () => {});

      socket.on("join_device_error", (data: { message: string }) => {
        toast.error(data.message);
      });

      socket.on("print_comanda", (data: PrintJob) => {
        setComandas((prev) => [data, ...prev].slice(0, 50));
      });

      socket.on("connect_error", () => {
        toast.error("Erro ao conectar ao servidor.");
      });

      socketRef.current = socket;
    },
    [location],
  );

  useEffect(() => {
    if (configured && restaurantId) {
      connectSocket(restaurantId);
    }
    return () => {
      socketRef.current?.disconnect();
    };
  }, [configured, restaurantId, connectSocket]);

  async function scanNetwork() {
    setScanning(true);
    setDiscovered([]);

    const results: DiscoveredPrinter[] = [];
    const allIps = Array.from({ length: 254 }, (_, i) => `${subnet}.${i + 1}`);

    for (let i = 0; i < allIps.length; i += BATCH_SIZE) {
      const batch = allIps.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map((ip) =>
        fetch(`http://${ip}:9100`, { method: "POST", signal: AbortSignal.timeout(SCAN_TIMEOUT) })
          .then(() => {
            results.push({ ip, port: 9100, name: `Impressora ${ip}` });
          })
          .catch(() => {}),
      );
      await Promise.allSettled(batchPromises);
      setDiscovered([...results]);
    }

    setScanning(false);

    if (results.length === 0) {
      toast.error("Nenhuma impressora encontrada na rede.");
    }
  }

  const ESC = "\x1B";
  const CENTER = `${ESC}\x61\x01`;
  const LEFT = `${ESC}\x61\x00`;
  const BOLD_ON = `${ESC}\x45\x01`;
  const BOLD_OFF = `${ESC}\x45\x00`;

  function sendToNetworkPrinter(comanda: PrintComanda) {
    const printerIp = comanda.printer.ip;
    const printerPort = comanda.printer.port || 9100;

    const lines: string[] = [];
    lines.push(`${BOLD_ON}${CENTER}${comanda.restaurantName ?? "OSDEX"}${BOLD_OFF}`);
    lines.push(`${CENTER}PEDIDO${LEFT}`);
    lines.push("─".repeat(32));
    lines.push(`Mesa: ${comanda.tableNumber}`);
    lines.push(`Hora: ${new Date(comanda.createdAt).toLocaleTimeString("pt-BR")}`);
    lines.push("─".repeat(32));
    lines.push("");

    for (const item of comanda.items) {
      const prefix = item.quantity > 1 ? `${item.quantity}x ` : "";
      lines.push(` ${prefix}${item.name}`);
      if (item.notes) lines.push(`   Obs: ${item.notes}`);
    }

    lines.push("");
    lines.push("─".repeat(32));
    lines.push(`${CENTER}${comanda.orderId.slice(0, 8).toUpperCase()}${LEFT}`);
    lines.push("");

    const escposData = btoa(lines.join("\n"));

    fetch(`/api/print`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ip: printerIp, port: printerPort, data: escposData }),
    }).catch(() => {
      toast.error(`Falha ao enviar para ${printerIp}:${printerPort}`);
    });
  }

  function sendReceiptToNetworkPrinter(receipt: PrintReceipt) {
    const printerIp = receipt.printer.ip;
    const printerPort = receipt.printer.port || 9100;

    const fmt = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
    const dottedLine = (left: string, right: string) => {
      const dots = " ".repeat(Math.max(0, 32 - left.length - right.length));
      return `${left}${dots}${right}`;
    };
    const methodLabels: Record<string, string> = {
      CASH: "Dinheiro",
      PIX: "PIX",
      DEBIT: "Débito",
      CREDIT: "Crédito",
      VOUCHER: "Voucher",
      CHECK: "Cheque",
      STORE_CREDIT: "Crédito Loja",
      MIXED: "Misto",
    };

    const lines: string[] = [];
    lines.push(`${BOLD_ON}${CENTER}${receipt.restaurantName}${BOLD_OFF}`);
    if (receipt.restaurantCnpj) lines.push(`${CENTER}CNPJ: ${receipt.restaurantCnpj}${LEFT}`);
    if (receipt.restaurantAddress) {
      const addrParts = receipt.restaurantAddress.split(' - ');
      if (addrParts.length >= 2) {
        lines.push(`${CENTER}${addrParts[0]}${LEFT}`);
        lines.push(`${CENTER}${addrParts.slice(1).join(' - ')}${LEFT}`);
      } else {
        lines.push(`${CENTER}${receipt.restaurantAddress}${LEFT}`);
      }
    }
    if (receipt.restaurantPhone) lines.push(`${CENTER}Tel: ${receipt.restaurantPhone}${LEFT}`);
    lines.push(`${BOLD_ON}${CENTER}COMPROVANTE${BOLD_OFF}${LEFT}`);
    lines.push("─".repeat(32));
    lines.push(`${CENTER}Mesa: ${receipt.tableNumber}  |  Hora: ${new Date(receipt.createdAt).toLocaleTimeString("pt-BR")}${LEFT}`);
    lines.push("─".repeat(32));

    for (const item of receipt.items) {
      const total = item.price * item.quantity;
      const prefix = item.quantity > 1 ? `${item.quantity}x ` : "";
      lines.push(dottedLine(`  ${prefix}${item.name}`, `R$ ${fmt(total)}`));
    }

    lines.push("─".repeat(32));
    lines.push(dottedLine("  Subtotal:", `R$ ${fmt(receipt.subtotal)}`));
    if (receipt.serviceCharge > 0) {
      lines.push(dottedLine("  Serviço:", `R$ ${fmt(receipt.serviceCharge)}`));
    }
    if (receipt.discount > 0) {
      lines.push(dottedLine("  Desconto:", `-R$ ${fmt(receipt.discount)}`));
    }
    lines.push(`${BOLD_ON}${dottedLine("  TOTAL:", `R$ ${fmt(receipt.finalAmount)}`)}${BOLD_OFF}`);
    lines.push("─".repeat(32));
    lines.push(`${CENTER}Pgto: ${methodLabels[receipt.method] ?? receipt.method}${LEFT}`);
    if (receipt.cashReceived !== null) {
      lines.push(dottedLine("  Recebido:", `R$ ${fmt(receipt.cashReceived)}`));
    }
    if (receipt.change !== null && receipt.change > 0) {
      lines.push(dottedLine("  Troco:", `R$ ${fmt(receipt.change)}`));
    }
    lines.push("─".repeat(32));
    lines.push(`${CENTER}${receipt.orderId.slice(0, 8).toUpperCase()}${LEFT}`);
    lines.push("");

    const escposData = btoa(lines.join("\n"));

    fetch(`/api/print`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ip: printerIp, port: printerPort, data: escposData }),
    }).catch(() => {
      toast.error(`Falha ao enviar para ${printerIp}:${printerPort}`);
    });
  }

  function printViaBrowser(comanda: PrintComanda) {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Comanda - Mesa ${comanda.tableNumber}</title>
  <style>
    @media print {
      body { margin: 0; padding: 0; }
      @page { margin: 8mm; size: auto; }
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', monospace;
      font-size: 14px;
      color: #000;
      background: #fff;
      padding: 0;
      display: flex;
      justify-content: center;
    }
    .comanda-wrap {
      width: fit-content;
      max-width: 100%;
      padding: 12px;
    }
    .header {
      text-align: center;
      border-bottom: 2px dashed #000;
      padding-bottom: 8px;
      margin-bottom: 8px;
    }
    .header h1 { font-size: 18px; letter-spacing: 2px; }
    .meta { font-size: 12px; color: #333; margin-top: 4px; }
    .items { margin: 8px 0; }
    .item {
      display: flex;
      gap: 8px;
      padding: 3px 0;
      border-bottom: 1px dotted #ccc;
    }
    .item-qty { font-weight: bold; min-width: 28px; }
    .item-name { flex: 1; }
    .item-notes { font-size: 11px; color: #666; font-style: italic; padding-left: 36px; }
    .footer {
      text-align: center;
      border-top: 2px dashed #000;
      padding-top: 8px;
      margin-top: 8px;
      font-size: 11px;
    }
  </style>
</head>
<body>
  <div class="comanda-wrap">
    <div class="header">
      <h1>${comanda.restaurantName ?? "OSDEX"}</h1>
      <div class="meta">PEDIDO</div>
    </div>
    <div class="meta">
      <strong>Mesa:</strong> ${comanda.tableNumber} &nbsp;|&nbsp;
      <strong>Hora:</strong> ${new Date(comanda.createdAt).toLocaleTimeString("pt-BR")}
    </div>
    <div class="items">
      ${comanda.items
        .map(
          (item) => `
        <div class="item">
          <span class="item-qty">${item.quantity}x</span>
          <span class="item-name">${item.name}</span>
        </div>
        ${item.notes ? `<div class="item-notes">Obs: ${item.notes}</div>` : ""}
      `,
        )
        .join("")}
    </div>
    <div class="footer">
      Pedido: ${comanda.orderId.slice(0, 8).toUpperCase()}
    </div>
  </div>
</body>
</html>`;

    const win = window.open("", "_blank", "width=400,height=600");
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => win.print(), 500);
    }
  }

  function printReceiptViaBrowser(receipt: PrintReceipt) {
    const fmt = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
    const dottedLine = (left: string, right: string) => {
      return `${left}<span style="flex:1;border-bottom:1px dotted #999;margin:0 4px"></span>${right}`;
    };
    const methodLabels: Record<string, string> = {
      CASH: "Dinheiro",
      PIX: "PIX",
      DEBIT: "Débito",
      CREDIT: "Crédito",
      VOUCHER: "Voucher",
      CHECK: "Cheque",
      STORE_CREDIT: "Crédito Loja",
      MIXED: "Misto",
    };

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Comprovante - Mesa ${receipt.tableNumber}</title>
  <style>
    @media print {
      body { margin: 0; padding: 0; }
      @page { margin: 8mm; size: auto; }
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', monospace;
      font-size: 14px;
      color: #000;
      background: #fff;
      padding: 0;
      display: flex;
      justify-content: center;
    }
    .receipt-wrap {
      width: fit-content;
      max-width: 100%;
      padding: 12px;
    }
    .header {
      text-align: center;
      border-bottom: 2px dashed #000;
      padding-bottom: 8px;
      margin-bottom: 8px;
    }
    .header h1 { font-size: 18px; letter-spacing: 2px; }
    .header .subtitle { font-size: 12px; color: #333; margin-top: 4px; }
    .meta { font-size: 12px; color: #333; margin-top: 4px; text-align: center; }
    .items { margin: 8px 0; }
    .item {
      font-family: 'Courier New', monospace;
      font-size: 13px;
      padding: 3px 0;
      white-space: nowrap;
      overflow: hidden;
    }
    .totals { margin-top: 8px; border-top: 1px solid #000; padding-top: 8px; }
    .total-row {
      font-family: 'Courier New', monospace;
      font-size: 13px;
      padding: 2px 0;
      white-space: nowrap;
    }
    .total-row.final {
      font-weight: bold;
      font-size: 15px;
      border-top: 1px solid #000;
      padding-top: 4px;
      margin-top: 4px;
    }
    .dotted-line {
      display: flex;
      align-items: baseline;
    }
    .payment-info {
      margin-top: 8px;
      border-top: 1px dashed #000;
      padding-top: 8px;
      font-size: 12px;
    }
    .payment-row {
      font-family: 'Courier New', monospace;
      font-size: 13px;
      padding: 2px 0;
      white-space: nowrap;
    }
    .footer {
      text-align: center;
      border-top: 2px dashed #000;
      padding-top: 8px;
      margin-top: 12px;
      font-size: 11px;
    }
  </style>
</head>
<body>
  <div class="receipt-wrap">
    <div class="header">
      <h1>${receipt.restaurantName}</h1>
      ${receipt.restaurantCnpj ? `<div class="meta">CNPJ: ${receipt.restaurantCnpj}</div>` : ""}
      ${receipt.restaurantAddress ? (() => {
        const addrParts = receipt.restaurantAddress.split(' - ');
        if (addrParts.length >= 2) {
          return `<div class="meta">${addrParts[0]}</div><div class="meta">${addrParts.slice(1).join(' - ')}</div>`;
        }
        return `<div class="meta">${receipt.restaurantAddress}</div>`;
      })() : ""}
      ${receipt.restaurantPhone ? `<div class="meta">Tel: ${receipt.restaurantPhone}</div>` : ""}
      <div class="subtitle">COMPROVANTE DE PAGAMENTO</div>
    </div>
    <div class="meta">
      Mesa: ${receipt.tableNumber} &nbsp;|&nbsp;
      Hora: ${new Date(receipt.createdAt).toLocaleTimeString("pt-BR")}
    </div>
    <div class="items">
      ${receipt.items
        .map(
          (item) => {
            const prefix = item.quantity > 1 ? `${item.quantity}x ` : "";
            return `<div class="item dotted-line">${dottedLine(`${prefix}${item.name}`, `R$ ${fmt(item.price * item.quantity)}`)}</div>`;
          },
        )
        .join("")}
    </div>
    <div class="totals">
      <div class="total-row dotted-line">${dottedLine("Subtotal:", `R$ ${fmt(receipt.subtotal)}`)}</div>
      ${
        receipt.serviceCharge > 0
          ? `<div class="total-row dotted-line">${dottedLine("Serviço:", `R$ ${fmt(receipt.serviceCharge)}`)}</div>`
          : ""
      }
      ${
        receipt.discount > 0
          ? `<div class="total-row dotted-line">${dottedLine("Desconto:", `-R$ ${fmt(receipt.discount)}`)}</div>`
          : ""
      }
      <div class="total-row final dotted-line">${dottedLine("TOTAL:", `R$ ${fmt(receipt.finalAmount)}`)}</div>
    </div>
    <div class="payment-info">
      <div class="payment-row dotted-line">${dottedLine("Pagamento:", methodLabels[receipt.method] ?? receipt.method)}</div>
      ${
        receipt.cashReceived !== null
          ? `<div class="payment-row dotted-line">${dottedLine("Recebido:", `R$ ${fmt(receipt.cashReceived)}`)}</div>`
          : ""
      }
      ${
        receipt.change !== null && receipt.change > 0
          ? `<div class="payment-row dotted-line">${dottedLine("Troco:", `R$ ${fmt(receipt.change)}`)}</div>`
          : ""
      }
    </div>
    <div class="footer">
      ${receipt.orderId.slice(0, 8).toUpperCase()}
    </div>
  </div>
</body>
</html>`;

    const win = window.open("", "_blank", "width=400,height=600");
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => win.print(), 500);
    }
  }

  function sendComanda(job: PrintJob) {
    if (isReceipt(job)) {
      if (printMode === "network") {
        sendReceiptToNetworkPrinter(job);
      } else {
        printReceiptViaBrowser(job);
      }
    } else {
      if (printMode === "network") {
        sendToNetworkPrinter(job);
      } else {
        printViaBrowser(job);
      }
    }
  }

  function retryPrint(job: PrintJob) {
    sendComanda(job);
  }

  function removeComanda(index: number) {
    setComandas((prev) => prev.filter((_, i) => i !== index));
  }

  function configureManual() {
    if (!manualIp || !restaurantId) {
      toast.error("Preencha o IP e o ID do restaurante.");
      return;
    }
    const config = { restaurantId, location, printMode, ip: manualIp, port: manualPort, subnet };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    setConfigured(true);
    toast.success("Dispositivo configurado!");
  }

  function configureWithPrinter(printer: DiscoveredPrinter) {
    const config = {
      restaurantId,
      location,
      printMode,
      ip: printer.ip,
      port: printer.port,
      subnet,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    setConfigured(true);
    toast.success(`Configurado com ${printer.ip}`);
  }

  function configureBrowser() {
    if (!restaurantId) {
      toast.error("Preencha o ID do restaurante.");
      return;
    }
    const config = { restaurantId, location, printMode, subnet };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    setConfigured(true);
    toast.success("Dispositivo configurado!");
  }

  function resetConfig() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(COMANDAS_KEY);
    setComandas([]);
    setConfigured(false);
    socketRef.current?.disconnect();
  }

  return {
    restaurantId,
    setRestaurantId,
    location,
    setLocation,
    printMode,
    setPrintMode,
    configured,
    discovered,
    scanning,
    manualIp,
    setManualIp,
    manualPort,
    setManualPort,
    subnet,
    setSubnet,
    connected,
    comandas,
    scanNetwork,
    configureManual,
    configureWithPrinter,
    configureBrowser,
    sendComanda,
    retryPrint,
    removeComanda,
    resetConfig,
  };
}

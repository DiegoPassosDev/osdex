import net from "net";

export const runtime = "nodejs";

const PRIVATE_IP_RANGES = [
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/,
  /^192\.168\.\d{1,3}\.\d{1,3}$/,
  /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  /^169\.254\.\d{1,3}\.\d{1,3}$/,
];

const BLOCKED_IPS = new Set([
  "0.0.0.0",
  "169.254.169.254",
  "metadata.google.internal",
]);

function isValidIPv4(ip: string): boolean {
  const parts = ip.split(".");
  if (parts.length !== 4) return false;
  return parts.every((p) => {
    const n = Number(p);
    return Number.isInteger(n) && n >= 0 && n <= 255 && String(n) === p;
  });
}

function isAllowedIP(ip: string): boolean {
  if (BLOCKED_IPS.has(ip)) return false;
  if (!isValidIPv4(ip)) return false;
  return PRIVATE_IP_RANGES.some((range) => range.test(ip));
}

function getAuthToken(request: Request): string | null {
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  const cookieHeader = request.headers.get("Cookie");
  if (cookieHeader) {
    const match = cookieHeader.match(/osdex_auth_token=([^;]+)/);
    if (match) return match[1];
  }
  return null;
}

function verifyToken(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
    if (!payload.exp) return true;
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const token = getAuthToken(request);
  if (!token || !verifyToken(token)) {
    return Response.json(
      { error: "Não autorizado." },
      { status: 401 },
    );
  }

  const { ip, port, data } = await request.json();

  if (!ip || !port || !data) {
    return Response.json(
      { error: "Campos ip, port e data são obrigatórios." },
      { status: 400 },
    );
  }

  if (!isAllowedIP(ip)) {
    return Response.json(
      { error: "Endereço IP não permitido." },
      { status: 403 },
    );
  }

  const portNum = Number(port);
  if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535) {
    return Response.json(
      { error: "Porta inválida." },
      { status: 400 },
    );
  }

  const decoded = Buffer.from(data, "base64");

  return new Promise<Response>((resolve) => {
    const socket = net.createConnection({ host: ip, port: portNum }, () => {
      socket.write(decoded);
      socket.end();
    });

    socket.setTimeout(5000);

    socket.on("timeout", () => {
      socket.destroy();
      resolve(
        Response.json(
          { error: "Timeout ao conectar com a impressora." },
          { status: 504 },
        ),
      );
    });

    socket.on("error", (err) => {
      socket.destroy();
      resolve(
        Response.json(
          { error: `Falha ao enviar para ${ip}:${portNum} — ${err.message}` },
          { status: 502 },
        ),
      );
    });

    socket.on("close", () => {
      resolve(Response.json({ ok: true }));
    });
  });
}

import { NextRequest, NextResponse } from "next/server";

const PUBLIC_ROUTES = ["/login", "/api", "/device"];

const ROLE_ROUTES: Record<string, string[]> = {
  MANAGER: ["/manager", "/onboarding"],
  WAITER: ["/waiter"],
  KITCHEN: ["/kitchen"],
  BAR: ["/kitchen"],
  CASHIER: ["/cashier"],
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Arquivos estáticos — deixa passar
  if (pathname.includes(".")) {
    return NextResponse.next();
  }

  // Rotas públicas — deixa passar
  if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.next();
  }

  // Lê o store do Zustand salvo no cookie
  const authCookie = request.cookies.get("osdex_auth")?.value;

  if (!authCookie) {
    if (pathname.startsWith("/table")) {
      const tableId = request.nextUrl.searchParams.get("tableId");
      const destination = tableId
        ? `/login/customer?tableId=${tableId}`
        : "/login/customer";
      return NextResponse.redirect(new URL(destination, request.url));
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const auth = JSON.parse(decodeURIComponent(authCookie));
    const state = auth?.state;

    if (!state?.authenticated) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const employee = state?.employee;
    const guest = state?.guest;

    if (employee) {
      const role = employee.role as string;
      const allowedPrefixes = ROLE_ROUTES[role] || [];

      // Rota de cliente — funcionário não pode acessar sem guest
      if (pathname.startsWith("/table") && !guest) {
        const tableId = request.nextUrl.searchParams.get("tableId");
        const destination = tableId
          ? `/login/customer?tableId=${tableId}`
          : "/login/customer";
        return NextResponse.redirect(new URL(destination, request.url));
      }

      // Verifica se tem permissão para a rota atual
      const isAllowed = allowedPrefixes.some((prefix) =>
        pathname.startsWith(prefix),
      );

      if (!isAllowed) {
        const defaultRoute = allowedPrefixes[0] || "/login";
        return NextResponse.redirect(new URL(defaultRoute, request.url));
      }
    }

    // Verifica se é rota de cliente e há guest autenticado
    if (pathname.startsWith("/table") && !guest) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sounds).*)"],
};

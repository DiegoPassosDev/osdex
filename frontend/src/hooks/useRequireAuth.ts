import { useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { isAdminEmail } from "@/lib/admin";

type RequiredRole =
  | "MANAGER"
  | "WAITER"
  | "KITCHEN"
  | "BAR"
  | "GUEST"
  | "CASHIER";

export function useRequireAuth(role: RequiredRole | RequiredRole[]) {
  const { token, employee } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  const allowedRoles = useMemo(
    () => (Array.isArray(role) ? role : [role]).map((r) => r.toUpperCase() as RequiredRole),
    [role],
  );

  const isGuestRoute = useMemo(() => allowedRoles.includes("GUEST"), [allowedRoles]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const persistedAuth = window.localStorage.getItem("osdex_auth");
    const authCookie = document.cookie
      .split(";")
      .map((item) => item.trim())
      .find((item) => item.startsWith("osdex_auth="));

    // Sem nenhuma autenticação
    if (!token && !persistedAuth && !authCookie) {
      router.replace("/login");
      return;
    }

    // Token ainda hidratando — aguarda
    if (!token && (persistedAuth || authCookie)) {
      return;
    }

    // Administrador do sistema — só gerencia os cadastros de restaurantes
    if (
      employee &&
      isAdminEmail(employee.email) &&
      !pathname.startsWith("/onboarding")
    ) {
      router.replace("/onboarding");
      return;
    }

    // Rota de cliente — funcionário não pode acessar
    if (isGuestRoute && employee) {
      router.replace("/login");
      return;
    }

    // Rota de funcionário — verifica se o role está na lista permitida
    if (!isGuestRoute && (!employee || !allowedRoles.includes(employee.role as RequiredRole))) {
      router.replace("/login");
      return;
    }
  }, [token, employee, allowedRoles, isGuestRoute, router, pathname]);
}
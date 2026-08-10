import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Employee, Guest } from "@/types";

function setCookie(value: string) {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; secure" : "";
  document.cookie = `osdex_auth=${encodeURIComponent(value)}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Strict${secure}`;
}

function deleteCookie() {
  if (typeof document === "undefined") return;
  document.cookie = "osdex_auth=; path=/; max-age=0";
}

interface AuthState {
  token: string | null;
  guest: Guest | null;
  employee: Employee | null;
  restaurantId: string | null;
  sessionId: string | null;
  tableId: string | null;
  tableNumber: string | null;
  _hasHydrated: boolean; // ← novo

  setGuestAuth: (
    token: string,
    guest: Guest,
    restaurantId?: string,
    sessionId?: string,
  ) => void;
  setEmployeeAuth: (token: string, employee: Employee) => void;
  updateEmployee: (data: Partial<Employee>) => void;
  setSessionId: (sessionId: string) => void;
  setTableId: (tableId: string, restaurantId?: string) => void;
  setTableNumber: (number: string) => void;
  setHasHydrated: (v: boolean) => void; // ← novo
  logout: () => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      guest: null,
      employee: null,
      restaurantId: null,
      sessionId: null,
      tableId: null,
      tableNumber: null,
      _hasHydrated: false, // ← novo

      setGuestAuth: (token, guest, restaurantId, sessionId) => {
        set({
          token,
          guest,
          employee: null,
          restaurantId: restaurantId || null,
          sessionId: sessionId || null,
        });
        setCookie(
          JSON.stringify({
            state: {
              authenticated: true,
              guest: { id: guest.id, name: guest.name, email: guest.email },
              employee: null,
            },
          }),
        );
      },

      setEmployeeAuth: (token, employee) => {
        set({
          token,
          employee,
          guest: null,
          restaurantId: employee.restaurantId,
          sessionId: null,
        });
        setCookie(
          JSON.stringify({
            state: {
              authenticated: true,
              guest: null,
              employee: {
                id: employee.id,
                name: employee.name,
                role: employee.role,
                restaurantId: employee.restaurantId,
              },
            },
          }),
        );
      },

      updateEmployee: (data) => {
        set((state) => {
          if (!state.employee) return state;
          const updated = { ...state.employee, ...data };
          setCookie(
            JSON.stringify({
              state: {
                authenticated: true,
                guest: null,
                employee: {
                  id: updated.id,
                  name: updated.name,
                  role: updated.role,
                  restaurantId: updated.restaurantId,
                },
              },
            }),
          );
          return { employee: updated };
        });
      },

      setSessionId: (sessionId) => set({ sessionId }),

      setTableId: (tableId, restaurantId) =>
        set({
          tableId,
          ...(restaurantId ? { restaurantId } : {}),
        }),

      setTableNumber: (tableNumber) => set({ tableNumber }),

      setHasHydrated: (v) => set({ _hasHydrated: v }), // ← novo

      logout: () => {
        set({
          token: null,
          guest: null,
          employee: null,
          restaurantId: null,
          sessionId: null,
          tableId: null,
          tableNumber: null,
        });
        deleteCookie();
      },

      clearAuth: () => {
        set({
          token: null,
          guest: null,
          employee: null,
          restaurantId: null,
          sessionId: null,
          tableId: null,
          tableNumber: null,
        });
        deleteCookie();
      },
    }),
    {
      name: "osdex_auth",
      // ✅ Persiste tudo EXCETO dados de sessão/mesa do cliente
      partialize: (state) => ({
        token: state.token,
        guest: state.guest,
        employee: state.employee,

        // ✅ persistir sessão da mesa
        restaurantId: state.restaurantId,
        sessionId: state.sessionId,
        tableId: state.tableId,
        tableNumber: state.tableNumber,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
export const useAuthStoreHydrated = () => useAuthStore((s) => s._hasHydrated);

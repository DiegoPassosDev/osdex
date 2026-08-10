"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { toast } from "@/components/ui/Toast";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useAuthStore } from "@/store/auth.store";
import { isAdminEmail } from "@/lib/admin";

export interface RestaurantManager {
  id: string;
  name: string;
  email: string;
}

export interface RestaurantStats {
  tables: number;
  menuItems: number;
  employees: number;
  activeSessions: number;
}

export interface RestaurantSummary {
  id: string;
  name: string;
  cnpj?: string | null;
  phone?: string | null;
  address?: string | null;
  zipCode?: string | null;
  street?: string | null;
  number?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  active: boolean;
  createdAt: string;
  managers: RestaurantManager[];
  stats: RestaurantStats;
}

export interface RestaurantFormFields {
  restaurantName: string;
  cnpj: string;
  phone: string;
  zipCode: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
}

export interface CreateFormFields extends RestaurantFormFields {
  managerName: string;
  managerEmail: string;
  managerPassword: string;
  managerPin: string;
}

export interface EmployeeSummary {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  restaurantId: string;
  createdAt: string;
}

export const roleLabel: Record<string, string> = {
  MANAGER: "Gestor",
  WAITER: "Garçom",
  KITCHEN: "Cozinha",
  BAR: "Bar",
  CASHIER: "Caixa",
};

export type AdminModalState =
  | { mode: "create" }
  | { mode: "edit"; restaurant: RestaurantSummary }
  | null;

export const emptyCreateForm: CreateFormFields = {
  restaurantName: "",
  cnpj: "",
  phone: "",
  zipCode: "",
  street: "",
  number: "",
  neighborhood: "",
  city: "",
  state: "",
  managerName: "",
  managerEmail: "",
  managerPassword: "",
  managerPin: "",
};

export const emptyStats: RestaurantStats = {
  tables: 0,
  menuItems: 0,
  employees: 0,
  activeSessions: 0,
};

function extractMessage(err: any, fallback: string) {
  const message = err?.response?.data?.message || fallback;
  return Array.isArray(message) ? message[0] : message;
}

export async function searchCep(cep: string) {
  const digits = cep.replace(/\D/g, "");
  if (digits.length !== 8) {
    toast.error("Informe um CEP com 8 dígitos.");
    return null;
  }

  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    const data = await res.json();
    if (data.erro) {
      toast.error("CEP não encontrado.");
      return null;
    }
    return {
      street: data.logradouro || "",
      neighborhood: data.bairro || "",
      city: data.localidade || "",
      state: data.uf || "",
    };
  } catch {
    toast.error("Não foi possível buscar o CEP.");
    return null;
  }
}

function deriveAddress(form: Pick<RestaurantFormFields, "street" | "number" | "neighborhood">) {
  return [form.street, form.number, form.neighborhood]
    .filter(Boolean)
    .join(", ");
}

export function useAdminDashboard() {
  useRequireAuth("MANAGER");

  const employee = useAuthStore((state) => state.employee);
  const router = useRouter();

  useEffect(() => {
    if (employee && !isAdminEmail(employee.email)) {
      router.replace("/manager");
    }
  }, [employee, router]);

  const [restaurants, setRestaurants] = useState<RestaurantSummary[]>([]);
  const [loadingRestaurants, setLoadingRestaurants] = useState(true);
  const [modal, setModal] = useState<AdminModalState>(null);
  const [loadingAction, setLoadingAction] = useState(false);

  const loadRestaurants = useCallback(async () => {
    setLoadingRestaurants(true);
    try {
      const { data } = await api.get("/restaurants");
      setRestaurants(
        data.map((restaurant: any) => ({
          id: restaurant.id,
          name: restaurant.name,
          cnpj: restaurant.cnpj,
          phone: restaurant.phone,
          address: restaurant.address,
          zipCode: restaurant.zipCode,
          street: restaurant.street,
          number: restaurant.number,
          neighborhood: restaurant.neighborhood,
          city: restaurant.city,
          state: restaurant.state,
          active: restaurant.active !== false,
          createdAt: restaurant.createdAt,
          managers: (restaurant.employees || []).map((employee: any) => ({
            id: employee.id,
            name: employee.name,
            email: employee.email,
          })),
          stats: restaurant.stats || emptyStats,
        })),
      );
    } catch {
      setRestaurants([]);
    } finally {
      setLoadingRestaurants(false);
    }
  }, []);

  useEffect(() => {
    loadRestaurants();
  }, [loadRestaurants]);

  async function createRestaurant(form: CreateFormFields) {
    if (
      !form.restaurantName ||
      !form.managerName ||
      !form.managerEmail ||
      !form.managerPassword ||
      !form.managerPin
    ) {
      toast.error("Preencha os campos obrigatórios.");
      return false;
    }

    setLoadingAction(true);
    try {
      await api.post("/restaurants/onboarding", {
        name: form.restaurantName,
        cnpj: form.cnpj || undefined,
        phone: form.phone || undefined,
        zipCode: form.zipCode || undefined,
        street: form.street || undefined,
        number: form.number || undefined,
        neighborhood: form.neighborhood || undefined,
        city: form.city || undefined,
        state: form.state || undefined,
        managerName: form.managerName,
        managerEmail: form.managerEmail,
        managerPassword: form.managerPassword,
        managerPin: form.managerPin,
      });
      toast.success("Restaurante e gestor criados!");
      await loadRestaurants();
      return true;
    } catch (err: any) {
      toast.error(extractMessage(err, "Erro ao criar restaurante."));
      return false;
    } finally {
      setLoadingAction(false);
    }
  }

  async function updateRestaurant(id: string, form: RestaurantFormFields) {
    if (!form.restaurantName) {
      toast.error("Informe o nome do restaurante.");
      return false;
    }

    const address = deriveAddress(form) || undefined;

    setLoadingAction(true);
    try {
      await api.patch(`/restaurants/${id}`, {
        name: form.restaurantName,
        cnpj: form.cnpj || undefined,
        phone: form.phone || undefined,
        address,
        zipCode: form.zipCode || undefined,
        street: form.street || undefined,
        number: form.number || undefined,
        neighborhood: form.neighborhood || undefined,
        city: form.city || undefined,
        state: form.state || undefined,
      });
      toast.success("Restaurante atualizado!");
      await loadRestaurants();
      return true;
    } catch (err: any) {
      toast.error(extractMessage(err, "Erro ao atualizar restaurante."));
      return false;
    } finally {
      setLoadingAction(false);
    }
  }

  async function toggleActive(restaurant: RestaurantSummary) {
    setLoadingAction(true);
    try {
      await api.patch(`/restaurants/${restaurant.id}`, {
        active: !restaurant.active,
      });
      toast.success(
        restaurant.active
          ? "Restaurante desativado."
          : "Restaurante reativado!",
      );
      await loadRestaurants();
    } catch (err: any) {
      toast.error(extractMessage(err, "Erro ao atualizar restaurante."));
    } finally {
      setLoadingAction(false);
    }
  }

  const loadEmployees = useCallback(async (restaurantId: string) => {
    try {
      const { data } = await api.get(`/employees/admin/restaurant/${restaurantId}`);
      return data as EmployeeSummary[];
    } catch (err: any) {
      toast.error(extractMessage(err, "Erro ao carregar funcionários."));
      return [];
    }
  }, []);

  async function toggleEmployeeActive(employee: EmployeeSummary) {
    try {
      await api.patch(`/employees/${employee.id}`, {
        active: !employee.active,
      });
      toast.success(
        employee.active
          ? "Funcionário desativado."
          : "Funcionário reativado!",
      );
      return true;
    } catch (err: any) {
      toast.error(extractMessage(err, "Erro ao atualizar funcionário."));
      return false;
    }
  }

  async function resetEmployeeCredentials(
    id: string,
    password: string,
    pin: string,
  ) {
    if (password && password.length < 8) {
      toast.error("Senha deve ter no mínimo 8 caracteres.");
      return false;
    }
    if (pin && pin.length < 4) {
      toast.error("PIN deve ter no mínimo 4 caracteres.");
      return false;
    }

    try {
      await api.patch(`/employees/${id}`, {
        password: password || undefined,
        pin: pin || undefined,
      });
      toast.success("Credenciais atualizadas!");
      return true;
    } catch (err: any) {
      toast.error(extractMessage(err, "Erro ao atualizar credenciais."));
      return false;
    }
  }

  return {
    restaurants,
    loadingRestaurants,
    modal,
    setModal,
    loadingAction,
    createRestaurant,
    updateRestaurant,
    toggleActive,
    loadEmployees,
    toggleEmployeeActive,
    resetEmployeeCredentials,
  };
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { authService } from "@/services/auth.service";
import { isAdminEmail } from "@/lib/admin";
import { toast } from "@/components/ui/Toast";

const ROLE_ROUTES: Record<string, string> = {
  MANAGER: "/manager",
  WAITER: "/waiter",
  KITCHEN: "/kitchen",
  BAR: "/kitchen",
  CASHIER: "/cashier",
};

export function useLoginPage() {
  const router = useRouter();
  const { setEmployeeAuth } = useAuthStore();

  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit() {
    if (!form.email || !form.password) {
      toast.error("Preencha todos os campos.");
      return;
    }

    setLoading(true);
    try {
      const data = await authService.employeeLogin(form.email, form.password);
      setEmployeeAuth(data.accessToken, data.employee);
      toast.success(`Bem-vindo, ${data.employee.name.split(" ")[0]}!`);
      router.push(
        isAdminEmail(data.employee.email)
          ? "/onboarding"
          : ROLE_ROUTES[data.employee.role] || "/manager",
      );
    } catch (err: any) {
      const message = err?.response?.data?.message || "Credenciais inválidas.";
      toast.error(Array.isArray(message) ? message[0] : message);
    } finally {
      setLoading(false);
    }
  }

  return {
    form,
    loading,
    handleChange,
    handleSubmit,
  };
}
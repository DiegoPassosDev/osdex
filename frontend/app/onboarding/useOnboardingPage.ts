"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { toast } from "@/components/ui/Toast";
import { useRequireAuth } from "@/hooks/useRequireAuth";

const initialForm = {
  restaurantName: "",
  cnpj: "",
  phone: "",
  city: "",
  managerName: "",
  managerEmail: "",
  managerPassword: "",
  managerPin: "",
};

export function useOnboardingPage() {
  useRequireAuth("MANAGER");

  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<{
    restaurantName: string;
    email: string;
  } | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit() {
    if (
      !form.restaurantName ||
      !form.managerName ||
      !form.managerEmail ||
      !form.managerPassword ||
      !form.managerPin
    ) {
      toast.error("Preencha os campos obrigatórios.");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/restaurants/onboarding", {
        name: form.restaurantName,
        cnpj: form.cnpj || undefined,
        phone: form.phone || undefined,
        city: form.city || undefined,
        managerName: form.managerName,
        managerEmail: form.managerEmail,
        managerPassword: form.managerPassword,
        managerPin: form.managerPin,
      });
      setCreated({
        restaurantName: data.restaurant.name,
        email: data.manager.email,
      });
      setForm(initialForm);
      toast.success("Restaurante e gestor criados!");
    } catch (err: any) {
      const message =
        err?.response?.data?.message || "Erro ao criar restaurante.";
      toast.error(Array.isArray(message) ? message[0] : message);
    } finally {
      setLoading(false);
    }
  }

  return { form, loading, created, handleChange, handleSubmit };
}

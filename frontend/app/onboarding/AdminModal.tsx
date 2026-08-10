"use client";

import { useState } from "react";
import { X, Store, UserPlus, Pencil, Loader2, Search } from "lucide-react";
import { SlideUpModal, useSlideUpClose } from "@/components/ui/SlideUpModal";
import {
  RestaurantFormFields,
  RestaurantSummary,
  CreateFormFields,
  emptyCreateForm,
  searchCep,
} from "./useOnboardingPage";

const inputClass =
  "w-full px-4 py-3 rounded-xl border border-gray-600 bg-gray-800 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition";

function field(
  label: string,
  name: string,
  value: string,
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
  placeholder?: string,
  type: string = "text",
  required?: boolean,
  autoComplete?: string,
) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-300 mb-1.5 block">
        {label}
      </label>
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        className={inputClass}
      />
    </div>
  );
}

interface AdminModalProps {
  mode: "create" | "edit";
  restaurant?: RestaurantSummary;
  loading: boolean;
  onCreate: (form: CreateFormFields) => Promise<boolean>;
  onUpdate: (id: string, form: RestaurantFormFields) => Promise<boolean>;
  onClose: () => void;
}

function Inner({ mode, restaurant, loading, onCreate, onUpdate }: AdminModalProps) {
  const { close } = useSlideUpClose();

  const [createForm, setCreateForm] = useState<CreateFormFields>(emptyCreateForm);
  const [editForm, setEditForm] = useState<RestaurantFormFields>(() => ({
    restaurantName: restaurant?.name || "",
    cnpj: restaurant?.cnpj || "",
    phone: restaurant?.phone || "",
    zipCode: restaurant?.zipCode || "",
    street: restaurant?.street || "",
    number: restaurant?.number || "",
    neighborhood: restaurant?.neighborhood || "",
    city: restaurant?.city || "",
    state: restaurant?.state || "",
  }));
  const [loadingCep, setLoadingCep] = useState(false);

  const form = mode === "create" ? createForm : editForm;
  const setForm =
    mode === "create"
      ? (e: React.ChangeEvent<HTMLInputElement>) =>
          setCreateForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
      : (e: React.ChangeEvent<HTMLInputElement>) =>
          setEditForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  async function handleCepSearch() {
    setLoadingCep(true);
    try {
      const result = await searchCep(form.zipCode);
      if (result) {
        if (mode === "create") {
          setCreateForm((prev) => ({ ...prev, ...result }));
        } else {
          setEditForm((prev) => ({ ...prev, ...result }));
        }
      }
    } finally {
      setLoadingCep(false);
    }
  }

  async function handleSubmit() {
    if (mode === "create") {
      const ok = await onCreate(createForm);
      if (ok) close();
    } else if (restaurant) {
      const ok = await onUpdate(restaurant.id, editForm);
      if (ok) close();
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-orange-500/20 flex items-center justify-center">
            {mode === "create" ? (
              <Store className="w-4 h-4 text-orange-400" />
            ) : (
              <Pencil className="w-4 h-4 text-orange-400" />
            )}
          </div>
          <h3 className="font-bold text-white text-lg">
            {mode === "create" ? "Novo restaurante" : "Editar restaurante"}
          </h3>
        </div>
        <button onClick={close}>
          <X className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        {field(
          "Nome do restaurante *",
          "restaurantName",
          form.restaurantName,
          setForm,
          "Ex: Restaurante do Zé",
          "text",
          true,
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {field("CNPJ", "cnpj", form.cnpj, setForm, "00.000.000/0000-00")}
          {field("Telefone", "phone", form.phone, setForm, "(00) 0000-0000")}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-300 mb-1.5 block">
              CEP
            </label>
            <div className="flex gap-2">
              <input
                name="zipCode"
                type="text"
                value={form.zipCode}
                onChange={setForm}
                placeholder="00000-000"
                maxLength={9}
                autoComplete="postal-code"
                className={`${inputClass} min-w-0`}
              />
              <button
                type="button"
                onClick={handleCepSearch}
                disabled={loadingCep}
                className="flex items-center justify-center gap-1.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                {loadingCep ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">Buscar</span>
              </button>
            </div>
          </div>
          {field("Número", "number", form.number, setForm, "Ex: 123")}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {field("Rua", "street", form.street, setForm, "Ex: Av. das Flores")}
          {field("Bairro", "neighborhood", form.neighborhood, setForm, "Ex: Centro")}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {field("Cidade", "city", form.city, setForm, "Cidade")}
          {field("UF", "state", form.state, setForm, "UF", "text", false)}
        </div>

        {mode === "create" && (
          <>
            <div className="h-px bg-gray-700 my-1" />

            <div className="flex items-center gap-2 text-gray-300 text-sm font-medium">
              <UserPlus className="w-4 h-4 text-orange-400" />
              Conta do gestor
            </div>

            {field(
              "Nome do gestor *",
              "managerName",
              createForm.managerName,
              setForm,
              "Ex: João da Silva",
              "text",
              true,
            )}
            {field(
              "E-mail do gestor *",
              "managerEmail",
              createForm.managerEmail,
              setForm,
              "gestor@restaurante.com",
              "email",
              true,
              "email",
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {field(
                "Senha * (mín. 8)",
                "managerPassword",
                createForm.managerPassword,
                setForm,
                "••••••••",
                "password",
                true,
                "new-password",
              )}
              {field(
                "PIN * (mín. 4)",
                "managerPin",
                createForm.managerPin,
                setForm,
                "••••",
                "password",
                true,
                "new-password",
              )}
            </div>
          </>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : mode === "create" ? (
            <Store className="w-4 h-4" />
          ) : (
            <Pencil className="w-4 h-4" />
          )}
          {loading
            ? "Salvando..."
            : mode === "create"
              ? "Criar restaurante"
              : "Salvar alterações"}
        </button>
      </form>
    </>
  );
}

export function AdminModal(props: AdminModalProps) {
  return (
    <SlideUpModal
      onClose={props.onClose}
      className="p-6 pb-8 max-h-[90vh] overflow-y-auto sm:max-w-2xl"
    >
      <Inner key={props.mode === "edit" ? props.restaurant?.id : "create"} {...props} />
    </SlideUpModal>
  );
}

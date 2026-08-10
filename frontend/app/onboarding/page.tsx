"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Store, UserPlus, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { CustomToaster } from "@/components/ui/Toast";
import { ThemeToggle } from "@/components/theme/ThemeProvider";
import { useOnboardingPage } from "./useOnboardingPage";

const inputClass =
  "w-full px-4 py-3 rounded-xl border border-gray-600 bg-gray-800 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition";

export default function OnboardingPage() {
  const router = useRouter();
  const { form, loading, created, handleChange, handleSubmit } =
    useOnboardingPage();

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col relative overflow-hidden">
      <CustomToaster />

      <div className="fixed top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, var(--grad-end) 0%, var(--grad-mid) 50%, var(--grad-start) 100%)",
        }}
      />
      <div className="absolute top-[-80px] right-[-80px] w-80 h-80 rounded-full bg-gray-400/20" />
      <div className="absolute bottom-[-60px] left-[-60px] w-64 h-64 rounded-full bg-gray-400/20" />

      <div className="relative z-10 flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg bg-gray-800 rounded-3xl border border-gray-700 shadow-2xl p-8">
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => router.push("/manager")}
              className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>
            <div className="flex items-center gap-2">
              <Image
                src="/icone-osdex.svg"
                alt="OSdex"
                width={28}
                height={28}
                className="w-7 h-7"
              />
              <span className="text-white text-lg font-bold">OSdex</span>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
              <Store className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Novo restaurante</h1>
              <p className="text-gray-400 text-sm">
                Cria o restaurante e a conta do gestor
              </p>
            </div>
          </div>

          {created && (
            <div className="mb-6 rounded-xl border border-green-600/50 bg-green-500/10 p-4">
              <div className="flex items-center gap-2 text-green-400 font-medium mb-2">
                <CheckCircle2 className="w-5 h-5" />
                Restaurante criado com sucesso!
              </div>
              <p className="text-gray-300 text-sm">
                Restaurante:{" "}
                <span className="text-white font-medium">
                  {created.restaurantName}
                </span>
              </p>
              <p className="text-gray-300 text-sm">
                Gestor:{" "}
                <span className="text-white font-medium">{created.email}</span>
              </p>
              <p className="text-gray-400 text-xs mt-2">
                Passe essas credenciais ao restaurante. Ele fará login em{" "}
                <span className="text-orange-400">/login</span> e configurará
                mesas, cardápio e equipe pelo painel.
              </p>
            </div>
          )}

          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
          >
            <div>
              <label className="text-sm font-medium text-gray-300 mb-1.5 block">
                Nome do restaurante *
              </label>
              <input
                name="restaurantName"
                value={form.restaurantName}
                onChange={handleChange}
                placeholder="Ex: Restaurante do Zé"
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-300 mb-1.5 block">
                  CNPJ
                </label>
                <input
                  name="cnpj"
                  value={form.cnpj}
                  onChange={handleChange}
                  placeholder="00.000.000/0000-00"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300 mb-1.5 block">
                  Telefone
                </label>
                <input
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="(00) 0000-0000"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-300 mb-1.5 block">
                Cidade
              </label>
              <input
                name="city"
                value={form.city}
                onChange={handleChange}
                placeholder="Cidade / UF"
                className={inputClass}
              />
            </div>

            <div className="h-px bg-gray-700 my-1" />

            <div className="flex items-center gap-2 text-gray-300 text-sm font-medium mb-1">
              <UserPlus className="w-4 h-4 text-orange-400" />
              Conta do gestor
            </div>

            <div>
              <label className="text-sm font-medium text-gray-300 mb-1.5 block">
                Nome do gestor *
              </label>
              <input
                name="managerName"
                value={form.managerName}
                onChange={handleChange}
                placeholder="Ex: João da Silva"
                className={inputClass}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-300 mb-1.5 block">
                E-mail do gestor *
              </label>
              <input
                name="managerEmail"
                type="email"
                value={form.managerEmail}
                onChange={handleChange}
                placeholder="gestor@restaurante.com"
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-300 mb-1.5 block">
                  Senha * (mín. 8)
                </label>
                <input
                  name="managerPassword"
                  type="password"
                  value={form.managerPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300 mb-1.5 block">
                  PIN * (mín. 4)
                </label>
                <input
                  name="managerPin"
                  type="password"
                  value={form.managerPin}
                  onChange={handleChange}
                  placeholder="••••"
                  className={inputClass}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Store className="w-4 h-4" />
              )}
              {loading ? "Criando..." : "Criar restaurante"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

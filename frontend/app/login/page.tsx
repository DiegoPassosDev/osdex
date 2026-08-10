"use client";

import { useState } from "react";
import {
  LogIn,
  UtensilsCrossed,
  ClipboardList,
  Users,
  Eye,
  EyeOff,
} from "lucide-react";
import Image from "next/image";
import { CustomToaster } from "@/components/ui/Toast";
import { ThemeToggle } from "@/components/theme/ThemeProvider";
import { useLoginPage } from "./useLoginPage";

const inputClass =
  "w-full px-4 py-3 rounded-xl border border-gray-600 bg-gray-800 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition";

export default function LoginPage() {
  const { form, loading, handleChange, handleSubmit } = useLoginPage();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="fixed inset-0 flex overflow-hidden">
      <CustomToaster />

      <div className="fixed top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      {/* ── Lado Esquerdo — só desktop ── */}
      <div
        className="hidden lg:flex lg:w-3/5 relative overflow-hidden flex-col p-16 h-full"
        style={{
          background:
            "linear-gradient(135deg, var(--grad-end) 0%, var(--grad-mid) 50%, var(--grad-start) 100%)",
        }}
      >
        <div className="absolute top-[-80px] left-[-80px] w-80 h-80 rounded-full bg-gray-400/20" />
        <div className="absolute bottom-[-60px] right-[-60px] w-64 h-64 rounded-full bg-gray-400/20" />
        <div className="absolute top-1/2 right-[-40px] w-40 h-40 rounded-full bg-orange-500/10" />

        <div className="relative z-10 flex flex-col justify-center flex-1">
          <div className="flex items-center gap-3 mb-10">
            <Image src="/icone-osdex.svg" alt="OSdex" width={56} height={56} className="w-14 h-14" />
            <span className="text-white text-3xl font-bold tracking-tight">
              OSdex
            </span>
          </div>

          <h1 className="text-6xl font-bold text-white leading-tight">
            Gestão de
          </h1>
          <h1 className="text-6xl font-bold text-gray-400 leading-tight mb-6">
            Restaurantes
          </h1>

          <p className="text-gray-400 text-lg leading-relaxed max-w-md">
            Gerencie pedidos, mesas e equipes com agilidade e sincronização em
            tempo real.
          </p>

          <div className="flex flex-wrap gap-3 mt-10">
            {[
              { icon: UtensilsCrossed, label: "Pedidos" },
              { icon: ClipboardList, label: "Cardápio" },
              { icon: Users, label: "Equipe" },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-700 border border-gray-600 text-gray-300 text-sm font-medium"
              >
                <Icon className="w-4 h-4" />
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Lado Direito / Tela inteira no mobile ── */}
      <div
        className="w-full lg:w-2/5 flex items-center justify-center p-8 relative overflow-hidden"
      >
        {/* Fundo gradiente só no mobile */}
        <div
          className="absolute inset-0 lg:hidden"
          style={{
            background:
              "linear-gradient(135deg, var(--grad-end) 0%, var(--grad-mid) 50%, var(--grad-start) 100%)",
          }}
        />
        {/* Fundo sólido só no desktop */}
        <div className="absolute inset-0 hidden lg:block bg-gray-800" />

        {/* Círculos decorativos — só mobile */}
        <div className="absolute top-[-60px] left-[-60px] w-56 h-56 rounded-full bg-gray-400/20 lg:hidden" />
        <div className="absolute bottom-[-40px] right-[-40px] w-40 h-40 rounded-full bg-gray-400/20 lg:hidden" />
        <div className="absolute top-1/3 right-[-20px] w-24 h-24 rounded-full bg-orange-500/10 lg:hidden" />

        {/* Card */}
        <div className="relative z-10 w-full max-w-sm bg-gray-800 rounded-3xl border border-gray-700 shadow-2xl p-6 lg:bg-transparent lg:rounded-none lg:border-0 lg:shadow-none lg:p-0">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-6">
              <Image src="/icone-osdex.svg" alt="OSdex" width={36} height={36} className="w-9 h-9" />
              <span className="text-white text-xl font-bold">OSdex</span>
            </div>
            <h2 className="text-2xl font-bold text-white">Acesso restrito</h2>
            <p className="text-gray-400 text-sm mt-1">
              Área exclusiva para colaboradores
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <label className="text-sm font-medium text-gray-300 mb-1.5 block">
                E-mail
              </label>
              <input
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                placeholder="Digite seu e-mail"
                value={form.email}
                onChange={handleChange}
                className={inputClass}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-300 mb-1.5 block">
                Senha
              </label>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  placeholder="Digite sua senha"
                  value={form.password}
                  onChange={handleChange}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  className={`${inputClass} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed select-none"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              Entrar
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-700 text-center">
            <a
              href="/login/customer"
              className="text-sm text-orange-400 hover:text-orange-300 transition-colors"
            >
              Sou Cliente — acessar mesa
            </a>
          </div>

          <p className="text-center text-xs text-gray-500 mt-6">
            Suporte: {process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "fluixit@gmail.com"}
          </p>
        </div>
      </div>
    </div>
  );
}
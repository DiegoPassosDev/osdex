"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import { LogIn, UserPlus, Eye, EyeOff } from "lucide-react";
import { CustomToaster } from "@/components/ui/Toast";
import { ThemeToggle } from "@/components/theme/ThemeProvider";
import { useLoginCustomer } from "./useLoginCustomer";

const inputClass =
  "w-full px-4 py-3 rounded-xl border border-gray-600 bg-gray-800 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition";

function LoginCustomerInner() {
  const { form, loading, isRegister, tableId, handleChange, handleSubmit, toggleMode } =
    useLoginCustomer();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-8 overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, var(--grad-end) 0%, var(--grad-mid) 50%, var(--grad-start) 100%)",
      }}
    >
      <CustomToaster />

      {/* Botão de tema fixo */}
      <div className="fixed top-2 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* Círculos decorativos — igual ao mobile do funcionário */}
      <div className="absolute top-[-60px] left-[-60px] w-56 h-56 rounded-full bg-gray-400/20" />
      <div className="absolute bottom-[-40px] right-[-40px] w-40 h-40 rounded-full bg-gray-400/20" />
      <div className="absolute top-1/3 right-[-20px] w-24 h-24 rounded-full bg-orange-500/10" />

      {/* Card centralizado */}
      <div className="relative z-10 w-full max-w-sm bg-gray-800 rounded-3xl border border-gray-700 shadow-2xl p-6">

        {/* Logo */}
        <div className="flex items-center gap-2 mb-5">
          <div className="w-9 h-9 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
            <Image src="/icone-osdex.svg" alt="OSdex" width={24} height={24} className="w-6 h-6" />
          </div>
              <span className="text-white text-xl font-bold">OSdex</span>
        </div>

        {/* Título */}
        <div className="mb-5">
          <h2 className="text-2xl font-bold text-white">
            {isRegister ? "Criar conta" : "Bem-vindo!"}
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            {isRegister
              ? "Preencha seus dados para continuar"
              : tableId
              ? "Faça login para acessar o cardápio"
              : "Entre com suas credenciais para continuar"}
          </p>
        </div>

        {/* Formulário */}
        <div className="flex flex-col gap-4">
          {isRegister && (
            <div>
              <label className="text-sm font-medium text-gray-300 mb-1.5 block">
                Nome completo
              </label>
              <input
                name="name"
                placeholder="Digite seu nome"
                value={form.name}
                onChange={handleChange}
                autoComplete="name"
                className={inputClass}
              />
            </div>
          )}

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
                autoComplete={isRegister ? "new-password" : "current-password"}
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
            className="w-full mt-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed select-none"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isRegister ? (
              <UserPlus className="w-4 h-4" />
            ) : (
              <LogIn className="w-4 h-4" />
            )}
            {isRegister ? "Criar conta" : "Entrar"}
          </button>
        </div>

        {/* Toggle login/cadastro */}
        <p className="text-center text-sm text-gray-400 mt-5">
          {isRegister ? "Já tem conta?" : "Não tem conta?"}{" "}
          <button
            type="button"
            onClick={toggleMode}
            className="text-orange-400 font-semibold hover:underline active:opacity-70 select-none"
          >
            {isRegister ? "Entrar" : "Cadastrar"}
          </button>
        </p>

        <p className="text-center text-xs text-gray-500 mt-4">
          Suporte: fluixit@gmail.com
        </p>
      </div>
    </div>
  );
}

export default function LoginCustomerPage() {
  return (
    <Suspense fallback={null}>
      <LoginCustomerInner />
    </Suspense>
  );
}
"use client";

import { useEffect, useState } from "react";
import { X, Users, KeyRound, Power, Loader2, ShieldCheck } from "lucide-react";
import { SlideUpModal, useSlideUpClose } from "@/components/ui/SlideUpModal";
import { Button } from "@/components/ui/Button";
import {
  EmployeeSummary,
  RestaurantSummary,
  roleLabel,
} from "./useOnboardingPage";

const inputClass =
  "w-full px-4 py-3 rounded-xl border border-gray-600 bg-gray-800 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition";

interface EmployeesModalProps {
  restaurant: RestaurantSummary;
  onClose: () => void;
  loadEmployees: (restaurantId: string) => Promise<EmployeeSummary[]>;
  toggleEmployeeActive: (employee: EmployeeSummary) => Promise<boolean>;
  resetEmployeeCredentials: (
    id: string,
    password: string,
    pin: string,
  ) => Promise<boolean>;
}

function Inner({
  restaurant,
  loadEmployees,
  toggleEmployeeActive,
  resetEmployeeCredentials,
}: EmployeesModalProps) {
  const { close } = useSlideUpClose();

  const [employees, setEmployees] = useState<EmployeeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [resetFor, setResetFor] = useState<EmployeeSummary | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [newPin, setNewPin] = useState("");
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const data = await loadEmployees(restaurant.id);
      if (mounted) {
        setEmployees(data);
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [restaurant.id, loadEmployees]);

  async function handleToggle(employee: EmployeeSummary) {
    setActionId(employee.id);
    const ok = await toggleEmployeeActive(employee);
    setActionId(null);
    if (ok) {
      setEmployees((prev) =>
        prev.map((e) =>
          e.id === employee.id ? { ...e, active: !employee.active } : e,
        ),
      );
    }
  }

  async function handleReset() {
    if (!resetFor) return;
    setResetting(true);
    const ok = await resetEmployeeCredentials(
      resetFor.id,
      newPassword,
      newPin,
    );
    setResetting(false);
    if (ok) {
      setResetFor(null);
      setNewPassword("");
      setNewPin("");
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-orange-500/20 flex items-center justify-center shrink-0">
            <Users className="w-4 h-4 text-orange-400" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-white text-lg leading-tight truncate">
              Funcionários
            </h3>
            <p className="text-xs text-gray-400 truncate">{restaurant.name}</p>
          </div>
        </div>
        <button onClick={close} aria-label="Fechar">
          <X className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 text-gray-400 text-sm py-12">
          <Loader2 className="w-5 h-5 animate-spin" />
          Carregando funcionários...
        </div>
      ) : employees.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-700 bg-gray-800/50 p-8 text-center">
          <Users className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-300 font-medium">Nenhum funcionário.</p>
          <p className="text-gray-500 text-sm mt-1">
            O gestor pode adicionar a equipe pelo painel do restaurante.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3 max-h-[55vh] overflow-y-auto pr-1">
          {employees.map((employee) => (
            <li
              key={employee.id}
              className="rounded-2xl border border-gray-700 bg-gray-800 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-semibold text-sm truncate">
                      {employee.name}
                    </p>
                    {employee.role === "MANAGER" && (
                      <ShieldCheck className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate">
                    {employee.email}
                  </p>
                </div>
                <span
                  className={
                    employee.active
                      ? "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/15 text-green-400 border border-green-500/30 shrink-0"
                      : "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/15 text-red-400 border border-red-500/30 shrink-0"
                  }
                >
                  <span
                    className={
                      employee.active
                        ? "w-1.5 h-1.5 rounded-full bg-green-400"
                        : "w-1.5 h-1.5 rounded-full bg-red-400"
                    }
                  />
                  {employee.active ? "Ativo" : "Inativo"}
                </span>
              </div>

              <p className="text-xs text-gray-400 mt-1.5">
                Cargo:{" "}
                <span className="text-gray-300">
                  {roleLabel[employee.role] || employee.role}
                </span>
              </p>

              <div className="flex gap-2 mt-3">
                <Button
                  variant={employee.active ? "ghost" : "secondary"}
                  size="sm"
                  icon={Power}
                  onClick={() => handleToggle(employee)}
                  loading={actionId === employee.id}
                  className="flex-1"
                >
                  {employee.active ? "Desativar" : "Ativar"}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={KeyRound}
                  onClick={() => setResetFor(employee)}
                  className="flex-1"
                >
                  Senha / PIN
                </Button>
              </div>

              {resetFor?.id === employee.id && (
                <div className="mt-3 flex flex-col gap-3 rounded-xl border border-orange-500/30 bg-orange-500/5 p-3">
                  <p className="text-xs text-gray-300 font-medium">
                    Redefinir credenciais de {employee.name}
                  </p>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nova senha (mín. 8)"
                    autoComplete="new-password"
                    className={inputClass}
                  />
                  <input
                    type="password"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    placeholder="Novo PIN (mín. 4)"
                    autoComplete="new-password"
                    className={inputClass}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleReset}
                      loading={resetting}
                      className="flex-1"
                    >
                      Salvar credenciais
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setResetFor(null);
                        setNewPassword("");
                        setNewPin("");
                      }}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export function EmployeesModal(props: EmployeesModalProps) {
  return (
    <SlideUpModal
      onClose={props.onClose}
      className="p-6 pb-8 max-h-[90vh] overflow-y-auto sm:max-w-2xl"
    >
      <Inner key={props.restaurant.id} {...props} />
    </SlideUpModal>
  );
}

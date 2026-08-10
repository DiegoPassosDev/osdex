"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Store,
  Building2,
  Users,
  CheckCircle2,
  Power,
  Phone,
  MapPin,
  Plus,
  Pencil,
  LogOut,
  Loader2,
  ShieldAlert,
  PackageOpen,
  Search,
  Sofa,
  UtensilsCrossed,
  Activity,
} from "lucide-react";
import { CustomToaster } from "@/components/ui/Toast";
import { ThemeToggle } from "@/components/theme/ThemeProvider";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/auth.store";
import { useAdminDashboard, RestaurantSummary } from "./useOnboardingPage";
import { AdminModal } from "./AdminModal";
import { EmployeesModal } from "./EmployeesModal";

type SortOption = "recent" | "name-asc" | "name-desc";

export default function OnboardingPage() {
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const {
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
  } = useAdminDashboard();

  const [pendingDeactivate, setPendingDeactivate] = useState<string | null>(null);
  const [employeesFor, setEmployeesFor] = useState<RestaurantSummary | null>(null);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("recent");

  useEffect(() => {
    if (!pendingDeactivate) return;
    const timer = setTimeout(() => setPendingDeactivate(null), 4000);
    return () => clearTimeout(timer);
  }, [pendingDeactivate]);

  const total = restaurants.length;
  const active = restaurants.filter((r) => r.active).length;
  const inactive = total - active;
  const managers = restaurants.reduce((acc, r) => acc + r.managers.length, 0);

  const filtered = restaurants
    .filter((restaurant) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return (
        restaurant.name.toLowerCase().includes(q) ||
        (restaurant.city || "").toLowerCase().includes(q) ||
        (restaurant.state || "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sortBy === "name-asc") return a.name.localeCompare(b.name);
      if (sortBy === "name-desc") return b.name.localeCompare(a.name);
      return (
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });

  function handleLogout() {
    logout();
    router.push("/login");
  }

  async function handleToggle(restaurant: RestaurantSummary) {
    if (pendingDeactivate !== restaurant.id) {
      setPendingDeactivate(restaurant.id);
      return;
    }
    setPendingDeactivate(null);
    await toggleActive(restaurant);
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col relative overflow-hidden">
      <CustomToaster />

      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, var(--grad-end) 0%, var(--grad-mid) 50%, var(--grad-start) 100%)",
        }}
      />
      <div className="absolute top-[-80px] right-[-80px] w-80 h-80 rounded-full bg-gray-400/20" />
      <div className="absolute bottom-[-60px] left-[-60px] w-64 h-64 rounded-full bg-gray-400/20" />

      <div className="relative z-10 flex-1 w-full max-w-6xl mx-auto flex flex-col px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <header className="flex items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <Image
              src="/icone-osdex.svg"
              alt="OSdex"
              width={36}
              height={36}
              className="w-9 h-9 sm:w-10 sm:h-10"
            />
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white leading-tight">
                Dashboard do administrador
              </h1>
              <p className="text-xs sm:text-sm text-gray-400">
                Cadastro e controle dos restaurantes
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              icon={LogOut}
              onClick={handleLogout}
              className="hidden sm:inline-flex"
            >
              Sair
            </Button>
            <button
              onClick={handleLogout}
              className="sm:hidden flex items-center justify-center w-9 h-9 rounded-xl bg-gray-800 border border-gray-700 text-gray-400 hover:text-white transition"
              aria-label="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="rounded-2xl border border-gray-700 bg-gray-800 p-4 sm:p-5">
            <Building2 className="w-5 h-5 text-orange-400 mb-2" />
            <p className="text-2xl sm:text-3xl font-bold text-white">{total}</p>
            <p className="text-xs sm:text-sm text-gray-400">Restaurantes</p>
          </div>
          <div className="rounded-2xl border border-gray-700 bg-gray-800 p-4 sm:p-5">
            <CheckCircle2 className="w-5 h-5 text-green-400 mb-2" />
            <p className="text-2xl sm:text-3xl font-bold text-white">{active}</p>
            <p className="text-xs sm:text-sm text-gray-400">Ativos</p>
          </div>
          <div className="rounded-2xl border border-gray-700 bg-gray-800 p-4 sm:p-5">
            <Power className="w-5 h-5 text-red-400 mb-2" />
            <p className="text-2xl sm:text-3xl font-bold text-white">{inactive}</p>
            <p className="text-xs sm:text-sm text-gray-400">Inativos</p>
          </div>
          <div className="rounded-2xl border border-gray-700 bg-gray-800 p-4 sm:p-5">
            <Users className="w-5 h-5 text-blue-400 mb-2" />
            <p className="text-2xl sm:text-3xl font-bold text-white">{managers}</p>
            <p className="text-xs sm:text-sm text-gray-400">Gestores</p>
          </div>
        </section>

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base sm:text-lg font-bold text-white">
            Restaurantes cadastrados
          </h2>
          <Button
            size="sm"
            icon={Plus}
            onClick={() => setModal({ mode: "create" })}
            className="sm:h-10 sm:px-5"
          >
            Adicionar novo
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome ou cidade..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-600 bg-gray-800 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-4 py-2.5 rounded-xl border border-gray-600 bg-gray-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition sm:w-48"
          >
            <option value="recent">Mais recentes</option>
            <option value="name-asc">Nome A–Z</option>
            <option value="name-desc">Nome Z–A</option>
          </select>
        </div>

        {loadingRestaurants ? (
          <div className="flex items-center justify-center gap-2 text-gray-400 text-sm py-16">
            <Loader2 className="w-5 h-5 animate-spin" />
            Carregando restaurantes...
          </div>
        ) : restaurants.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-gray-700 bg-gray-800/50 p-10 text-center">
            <PackageOpen className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-300 font-medium">
              Nenhum restaurante cadastrado.
            </p>
            <p className="text-gray-500 text-sm mt-1">
              Clique em &quot;Adicionar novo&quot; para criar o primeiro.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-gray-700 bg-gray-800/50 p-10 text-center">
            <Search className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-300 font-medium">
              Nenhum restaurante encontrado.
            </p>
            <p className="text-gray-500 text-sm mt-1">
              Ajuste o termo de busca para ver resultados.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((restaurant) => (
              <div
                key={restaurant.id}
                className="rounded-2xl border border-gray-700 bg-gray-800 p-5 flex flex-col gap-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-orange-500/20 flex items-center justify-center shrink-0">
                      <Store className="w-5 h-5 text-orange-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-semibold leading-tight break-words">
                        {restaurant.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3 shrink-0" />
                        {[restaurant.city, restaurant.state]
                          .filter(Boolean)
                          .join(" / ") || "Local não informado"}
                      </p>
                    </div>
                  </div>
                  {restaurant.active ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/15 text-green-400 border border-green-500/30 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                      Ativo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/15 text-red-400 border border-red-500/30 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                      Inativo
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-1.5 text-sm text-gray-400">
                  <span className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 shrink-0" />
                    {restaurant.phone || "Sem telefone"}
                  </span>
                  {restaurant.managers.length === 0 ? (
                    <span className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 shrink-0" />
                      Sem gestores
                    </span>
                  ) : (
                    <ul className="flex flex-col gap-1">
                      {restaurant.managers.map((manager) => (
                        <li
                          key={manager.id}
                          className="flex items-center gap-1.5 truncate"
                          title={`${manager.name} · ${manager.email}`}
                        >
                          <Users className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span className="text-gray-300 truncate">
                            {manager.name}
                          </span>
                          <span className="text-gray-500 truncate">
                            · {manager.email}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <div className="rounded-xl bg-gray-700/40 px-1 py-2 text-center">
                    <Sofa className="w-4 h-4 text-orange-400 mx-auto mb-1" />
                    <p className="text-sm font-bold text-white">
                      {restaurant.stats.tables}
                    </p>
                    <p className="text-[10px] text-gray-400">Mesas</p>
                  </div>
                  <div className="rounded-xl bg-gray-700/40 px-1 py-2 text-center">
                    <UtensilsCrossed className="w-4 h-4 text-orange-400 mx-auto mb-1" />
                    <p className="text-sm font-bold text-white">
                      {restaurant.stats.menuItems}
                    </p>
                    <p className="text-[10px] text-gray-400">Cardápio</p>
                  </div>
                  <div className="rounded-xl bg-gray-700/40 px-1 py-2 text-center">
                    <Users className="w-4 h-4 text-orange-400 mx-auto mb-1" />
                    <p className="text-sm font-bold text-white">
                      {restaurant.stats.employees}
                    </p>
                    <p className="text-[10px] text-gray-400">Equipe</p>
                  </div>
                  <div className="rounded-xl bg-gray-700/40 px-1 py-2 text-center">
                    <Activity className="w-4 h-4 text-orange-400 mx-auto mb-1" />
                    <p className="text-sm font-bold text-white">
                      {restaurant.stats.activeSessions}
                    </p>
                    <p className="text-[10px] text-gray-400">Sessões</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 mt-auto pt-1">
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={Pencil}
                      onClick={() =>
                        setModal({ mode: "edit", restaurant })
                      }
                      className="flex-1"
                    >
                      Editar
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={Users}
                      onClick={() => setEmployeesFor(restaurant)}
                      className="flex-1"
                    >
                      Equipe
                    </Button>
                  </div>
                  <Button
                    variant={
                      pendingDeactivate === restaurant.id ? "danger" : "ghost"
                    }
                    size="sm"
                    icon={Power}
                    onClick={() => handleToggle(restaurant)}
                    disabled={loadingAction}
                    className="flex-1"
                  >
                    {pendingDeactivate === restaurant.id
                      ? "Confirmar?"
                      : restaurant.active
                        ? "Desativar"
                        : "Ativar"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-start gap-2 mt-6 text-xs text-gray-500 bg-gray-800/50 border border-gray-700 rounded-2xl p-4">
          <ShieldAlert className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
          <p>
            Ao desativar um restaurante, todos os funcionários dele ficam
            impedidos de entrar e usar o sistema até a reativação.
          </p>
        </div>
      </div>

      {modal && (
        <AdminModal
          mode={modal.mode}
          restaurant={modal.mode === "edit" ? modal.restaurant : undefined}
          loading={loadingAction}
          onCreate={createRestaurant}
          onUpdate={updateRestaurant}
          onClose={() => setModal(null)}
        />
      )}

      {employeesFor && (
        <EmployeesModal
          restaurant={employeesFor}
          onClose={() => setEmployeesFor(null)}
          loadEmployees={loadEmployees}
          toggleEmployeeActive={toggleEmployeeActive}
          resetEmployeeCredentials={resetEmployeeCredentials}
        />
      )}
    </div>
  );
}

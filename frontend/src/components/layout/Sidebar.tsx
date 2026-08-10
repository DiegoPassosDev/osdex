"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LucideIcon, Menu, Store, X } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";

interface NavItem {
  href: string;
  icon: LucideIcon;
  label: string;
}

interface SidebarProps {
  items: NavItem[];
}

const ADMIN_EMAILS = (
  process.env.NEXT_PUBLIC_ONBOARDING_ADMIN_EMAILS || "fluixit@gmail.com"
)
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export function Sidebar({ items }: SidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const employee = useAuthStore((state) => state.employee);

  const isAdmin = employee
    ? ADMIN_EMAILS.includes(employee.email.toLowerCase())
    : false;

  const navItems = isAdmin
    ? [
        ...items,
        {
          href: "/onboarding",
          icon: Store,
          label: "Restaurantes",
        },
      ]
    : items;

  const renderNavItems = (mobile = false) =>
    navItems.map((item) => {
      const Icon = item.icon;
      const active =
        item.href === "/manager"
          ? pathname === "/manager"
          : pathname.startsWith(item.href);

      return (
        <Link
          key={item.href}
          href={item.href}
          onClick={() => mobile && setOpen(false)}
          className={`group relative flex h-12 items-center rounded-2xl transition-all duration-200 ${
            mobile ? "w-full justify-start gap-3 px-3" : "w-full justify-center"
          } ${
            active
              ? "bg-orange-500/20 text-orange-400"
              : "text-gray-400 hover:bg-gray-700 hover:text-white"
          }`}
        >
          <Icon className="h-5 w-5 shrink-0" />
          {mobile ? (
            <span className="text-sm font-medium">{item.label}</span>
          ) : (
            <span className="pointer-events-none absolute left-[78px] top-1/2 hidden -translate-y-1/2 whitespace-nowrap rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 md:block">
              {item.label}
            </span>
          )}
        </Link>
      );
    });

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-4 z-50 flex h-11 w-11 items-center justify-center rounded-2xl border border-gray-700 bg-gray-800 text-gray-200 shadow-lg md:hidden"
        aria-label="Abrir navegacao"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Fechar navegacao"
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
          />

          <aside className="relative flex h-full w-64 flex-col border-r border-gray-700 bg-gray-800 px-3 py-4 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-500">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 563 550" className="w-12 h-12"><path fill="white" d="M266 84.6c-58.2 5.3-108 33.5-140.9 79.9-32.2 45.3-42.8 103.3-29 158 6.4 25.2 18.3 49.1 35.4 71 7.5 9.6 25.2 26.9 35.5 34.6 44.2 33.2 101.3 45.5 155 33.4 55.8-12.6 105.9-52.8 130.4-104.7 8.1-17.1 12.4-30.8 16.2-51.8 2.7-14.7 2.5-45.5-.5-62.5-4.2-24.1-14.5-50.8-27.3-70.8l-5.1-7.9-3.4 4c-1.8 2.3-5 5.1-7.1 6.3-2 1.2-3.9 2.4-4.1 2.5-.2.2 1.5 3.2 3.7 6.6 11.3 18 19.8 39.7 23.8 61.3 2.9 15.5 2.7 48.1-.4 63-7.4 35-23.8 65.2-48.4 89.1-14.4 14-26.2 22.5-43 31-44.1 22.1-94.4 24.1-140.3 5.4-5.5-2.2-10.3-4.4-10.7-4.8s5.7-7.2 13.6-15.1l14.3-14.3 8.2 2.6c17.5 5.6 42.4 7.2 60.7 4.1 40.3-6.9 76.3-33.2 95.3-69.4 4.6-8.9 12.8-30.7 11.8-31.7-.2-.2-2.7-.8-5.5-1.4-2.8-.5-6.8-1.6-8.8-2.5-2-.8-3.9-1.3-4.1-1.1-.3.2-1.1 2.9-1.9 6.1-2.3 8.7-8.1 21.2-14 30.1-21.2 32.1-56.4 51.4-93.8 51.4-10.7 0-26.7-2.2-29.6-4-1.2-.7 8.8-11.2 43.5-46l45-45.1 3.6.6c8 1.4 17.3-3.4 21-10.7 3.1-6.1 2.4-16-1.5-21.6-3.7-5.3-9.5-8.2-16.8-8.2-11.6 0-19.8 8.1-20.3 20l-.2 6.1-69.8 69.5-69.8 69.4-2.6-1.6c-4.3-2.8-12.7-9.3-14.7-11.5-1.8-2-.7-3.1 115.1-118.9l117-117h5.3c9 0 15.5-3.8 19.4-11.4 2.8-5.5 2.2-15.9-1.1-20.8-5.2-7.5-14.3-10.8-22.9-8.3-9.2 2.8-16.4 13.6-14.7 22.3.6 3.3.3 3.9-6.1 10.4-7.1 7.1-8.4 7.7-10.4 5.4-2.2-2.8-18.8-13.6-26.9-17.6-10.6-5.3-26.3-10.5-38.1-12.6-5.2-.9-10.2-2.2-11-2.9-5.8-4.8-16.6-6.4-22.5-3.3-3.7 2-7.8 6.3-9.9 10.5-2 3.9-2.1 12.2-.3 16.6 1.9 4.5 8.8 10.4 13.7 11.7 8.6 2.3 18.6-1.8 23.2-9.6 2-3.4 2.3-3.5 6.2-2.9 15.2 2.6 39.6 14.2 51.5 24.5l2.4 2.1-102.7 102.7c-87 86.9-103 102.5-104.4 101.6-.9-.6-4.6-4.8-8-9.4l-6.4-8.3 68.9-68.9 68.8-68.8h5.8c7.1 0 11.7-2 15.7-6.8 6.7-8.1 6.1-20.2-1.4-27.6-8.4-8.4-19.3-8.6-28.1-.5-4.8 4.4-7 10.2-6.3 16.8l.3 4.1-43.6 43.6c-28.1 28.1-44.2 43.5-45.1 43.1-2.1-.8-4.8-17.5-4.8-29.9 0-35.8 16.7-68.7 46.5-91.4 6.8-5.1 25.7-14.7 32.5-16.4 7.4-1.8 7.1-1.5 5-6.2-1.1-2.5-2-6.5-2-9.6 0-3.6-.4-5.2-1.3-5.2-3.2 0-19.6 6.3-28.6 11.1-25.4 13.2-46.6 35.3-59.1 61.4-14.1 29.4-16.5 67.5-6 98.4l1.8 5.4-13.8 13.9c-7.6 7.6-14.5 13.8-15.3 13.8-3.6 0-14.3-34.1-16.7-53.2-1.8-14-.8-40.5 1.9-54.1 13.5-66.9 64.8-119.2 130.6-133.3 31.2-6.7 60.1-5.2 91 4.6 10 3.2 30.4 12.8 38 17.9 2.2 1.5 4.5 3.1 5.2 3.4.7.4 2.2-1.1 3.7-3.8 1.5-2.4 4.2-5.7 6.1-7.2 1.9-1.6 3.5-3.1 3.5-3.4 0-.4-3.5-2.9-7.7-5.6-22.1-14.3-44.1-22.7-71.1-27.3-11.3-2-36.6-3.3-46.2-2.4"/><path fill="white" d="m387.3 198.3-7.1 7.2 2.5 3.5c5.2 7.2 13.3 25.4 15.4 34.8l2.2 9.4-4.2 3.6c-7.3 6.6-9.3 16.8-4.8 25.3 6.6 12.5 23.5 14.5 33.1 3.9 7.4-8.2 7.3-19-.3-27.4-3.3-3.5-4-5.3-5.5-13-3.1-15.9-12.4-38.1-20.8-49.8l-3.4-4.7z"/></svg>
                </div>
                <span className="text-sm font-semibold text-white">OSdex</span>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-400 hover:bg-gray-700 hover:text-white"
                aria-label="Fechar navegacao"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex flex-col gap-2">{renderNavItems(true)}</nav>
          </aside>
        </div>
      )}

      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-16 flex-col items-center border-r border-gray-700 bg-gray-800 py-6 md:flex">
        <div className="mb-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-500">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 563 550" className="w-12 h-12"><path fill="white" d="M266 84.6c-58.2 5.3-108 33.5-140.9 79.9-32.2 45.3-42.8 103.3-29 158 6.4 25.2 18.3 49.1 35.4 71 7.5 9.6 25.2 26.9 35.5 34.6 44.2 33.2 101.3 45.5 155 33.4 55.8-12.6 105.9-52.8 130.4-104.7 8.1-17.1 12.4-30.8 16.2-51.8 2.7-14.7 2.5-45.5-.5-62.5-4.2-24.1-14.5-50.8-27.3-70.8l-5.1-7.9-3.4 4c-1.8 2.3-5 5.1-7.1 6.3-2 1.2-3.9 2.4-4.1 2.5-.2.2 1.5 3.2 3.7 6.6 11.3 18 19.8 39.7 23.8 61.3 2.9 15.5 2.7 48.1-.4 63-7.4 35-23.8 65.2-48.4 89.1-14.4 14-26.2 22.5-43 31-44.1 22.1-94.4 24.1-140.3 5.4-5.5-2.2-10.3-4.4-10.7-4.8s5.7-7.2 13.6-15.1l14.3-14.3 8.2 2.6c17.5 5.6 42.4 7.2 60.7 4.1 40.3-6.9 76.3-33.2 95.3-69.4 4.6-8.9 12.8-30.7 11.8-31.7-.2-.2-2.7-.8-5.5-1.4-2.8-.5-6.8-1.6-8.8-2.5-2-.8-3.9-1.3-4.1-1.1-.3.2-1.1 2.9-1.9 6.1-2.3 8.7-8.1 21.2-14 30.1-21.2 32.1-56.4 51.4-93.8 51.4-10.7 0-26.7-2.2-29.6-4-1.2-.7 8.8-11.2 43.5-46l45-45.1 3.6.6c8 1.4 17.3-3.4 21-10.7 3.1-6.1 2.4-16-1.5-21.6-3.7-5.3-9.5-8.2-16.8-8.2-11.6 0-19.8 8.1-20.3 20l-.2 6.1-69.8 69.5-69.8 69.4-2.6-1.6c-4.3-2.8-12.7-9.3-14.7-11.5-1.8-2-.7-3.1 115.1-118.9l117-117h5.3c9 0 15.5-3.8 19.4-11.4 2.8-5.5 2.2-15.9-1.1-20.8-5.2-7.5-14.3-10.8-22.9-8.3-9.2 2.8-16.4 13.6-14.7 22.3.6 3.3.3 3.9-6.1 10.4-7.1 7.1-8.4 7.7-10.4 5.4-2.2-2.8-18.8-13.6-26.9-17.6-10.6-5.3-26.3-10.5-38.1-12.6-5.2-.9-10.2-2.2-11-2.9-5.8-4.8-16.6-6.4-22.5-3.3-3.7 2-7.8 6.3-9.9 10.5-2 3.9-2.1 12.2-.3 16.6 1.9 4.5 8.8 10.4 13.7 11.7 8.6 2.3 18.6-1.8 23.2-9.6 2-3.4 2.3-3.5 6.2-2.9 15.2 2.6 39.6 14.2 51.5 24.5l2.4 2.1-102.7 102.7c-87 86.9-103 102.5-104.4 101.6-.9-.6-4.6-4.8-8-9.4l-6.4-8.3 68.9-68.9 68.8-68.8h5.8c7.1 0 11.7-2 15.7-6.8 6.7-8.1 6.1-20.2-1.4-27.6-8.4-8.4-19.3-8.6-28.1-.5-4.8 4.4-7 10.2-6.3 16.8l.3 4.1-43.6 43.6c-28.1 28.1-44.2 43.5-45.1 43.1-2.1-.8-4.8-17.5-4.8-29.9 0-35.8 16.7-68.7 46.5-91.4 6.8-5.1 25.7-14.7 32.5-16.4 7.4-1.8 7.1-1.5 5-6.2-1.1-2.5-2-6.5-2-9.6 0-3.6-.4-5.2-1.3-5.2-3.2 0-19.6 6.3-28.6 11.1-25.4 13.2-46.6 35.3-59.1 61.4-14.1 29.4-16.5 67.5-6 98.4l1.8 5.4-13.8 13.9c-7.6 7.6-14.5 13.8-15.3 13.8-3.6 0-14.3-34.1-16.7-53.2-1.8-14-.8-40.5 1.9-54.1 13.5-66.9 64.8-119.2 130.6-133.3 31.2-6.7 60.1-5.2 91 4.6 10 3.2 30.4 12.8 38 17.9 2.2 1.5 4.5 3.1 5.2 3.4.7.4 2.2-1.1 3.7-3.8 1.5-2.4 4.2-5.7 6.1-7.2 1.9-1.6 3.5-3.1 3.5-3.4 0-.4-3.5-2.9-7.7-5.6-22.1-14.3-44.1-22.7-71.1-27.3-11.3-2-36.6-3.3-46.2-2.4"/><path fill="white" d="m387.3 198.3-7.1 7.2 2.5 3.5c5.2 7.2 13.3 25.4 15.4 34.8l2.2 9.4-4.2 3.6c-7.3 6.6-9.3 16.8-4.8 25.3 6.6 12.5 23.5 14.5 33.1 3.9 7.4-8.2 7.3-19-.3-27.4-3.3-3.5-4-5.3-5.5-13-3.1-15.9-12.4-38.1-20.8-49.8l-3.4-4.7z"/></svg>
        </div>

        <nav className="flex w-full flex-1 flex-col items-center gap-4 px-2">
          {renderNavItems()}
        </nav>
      </aside>
    </>
  );
}

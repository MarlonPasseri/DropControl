"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigationItems } from "@/lib/mvp-data";

const iconMap: Record<string, string> = {
  "/dashboard": "dashboard",
  "/integrations": "hub",
  "/products": "inventory_2",
  "/suppliers": "local_shipping",
  "/orders": "receipt_long",
  "/invoices": "receipt",
  "/finance": "payments",
  "/tasks": "assignment",
};

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="mt-8 flex-1 space-y-1 px-4">
      {navigationItems.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-lg px-3 py-3 font-headline text-sm font-semibold tracking-wide transition-all duration-200 ${
              active
                ? "bg-[var(--primary-container)] text-[var(--on-primary-container)] shadow-[inset_0_0_0_1px_rgba(31,107,102,0.10)]"
                : "text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-low)] hover:text-slate-900"
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">
              {iconMap[item.href] ?? "dashboard"}
            </span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

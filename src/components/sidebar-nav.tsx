"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigationItems } from "@/lib/mvp-data";

const iconMap: Record<string, string> = {
  "/dashboard": "dashboard",
  "/products": "inventory_2",
  "/suppliers": "local_shipping",
  "/orders": "receipt_long",
  "/finance": "payments",
  "/tasks": "assignment",
};

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="mt-10 flex-1 space-y-1 px-4">
      {navigationItems.map((item) => {
        const active = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2 font-headline text-sm font-semibold tracking-wide transition-all duration-300 ${
              active
                ? "border-r-2 border-slate-900 bg-slate-200/50 text-slate-900"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
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

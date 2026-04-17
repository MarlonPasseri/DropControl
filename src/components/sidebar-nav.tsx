"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigationItems } from "@/lib/mvp-data";

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="mt-8 grid gap-2">
      {navigationItems.map((item) => {
        const active = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition ${
              active
                ? "bg-slate-100 text-slate-950"
                : "text-slate-300 hover:bg-slate-900 hover:text-white"
            }`}
          >
            <span className={`h-2.5 w-2.5 rounded-full ${item.accent}`} />
            <span>{item.label}</span>
            <span className="ml-auto rounded-md bg-black/10 px-2 py-1 text-xs uppercase tracking-[0.16em]">
              {item.shortLabel}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

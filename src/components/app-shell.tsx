import Link from "next/link";
import { ReactNode } from "react";
import { auth } from "@/auth";
import { SidebarNav } from "@/components/sidebar-nav";
import { SignOutButton } from "@/components/sign-out-button";

function getInitials(name?: string | null, email?: string | null) {
  const seed = name?.trim() || email?.trim() || "Operador";
  const [first = "", second = ""] = seed.split(/\s+/);
  return `${first[0] ?? ""}${second[0] ?? ""}`.toUpperCase() || "OP";
}

export async function AppShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  const session = await auth();
  const userName = session?.user?.name ?? "Operador principal";
  const userEmail = session?.user?.email ?? "Sessao protegida";
  const todayLabel = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(new Date());

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="z-40 flex w-full flex-col border-b border-slate-200 bg-slate-50 py-6 lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:border-b-0 lg:border-r">
        <div className="px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded bg-[var(--primary)] text-[var(--on-primary)]">
              <span className="material-symbols-outlined text-lg">architecture</span>
            </div>
            <div>
              <h1 className="font-headline text-lg font-extrabold uppercase tracking-tight text-slate-900">
                Control Center
              </h1>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                MVP Phase 5
              </p>
            </div>
          </div>
        </div>

        <SidebarNav />

        <div className="mt-8 px-4">
          <Link
            href="/orders"
            className="signature-gradient flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 font-headline text-sm font-bold text-[var(--on-primary)] shadow-[0_12px_30px_rgba(86,94,116,0.18)] transition-opacity hover:opacity-90"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            Novo envio
          </Link>
        </div>

        <div className="mt-auto px-4 pt-6">
          <div className="rounded-lg bg-[var(--surface-container-low)] p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Sessao ativa
            </p>
            <p className="mt-3 font-headline text-sm font-semibold text-slate-900">{userName}</p>
            <p className="mt-1 break-all text-xs text-[var(--on-surface-variant)]">{userEmail}</p>
          </div>

          <div className="mt-4 space-y-1">
            <Link
              href="/tasks"
              className="flex items-center gap-3 px-3 py-2 font-headline text-sm font-semibold tracking-wide text-slate-500 transition-all duration-300 hover:bg-slate-100 hover:text-slate-700"
            >
              <span className="material-symbols-outlined text-[20px]">headset_mic</span>
              <span>Support</span>
            </Link>
            <SignOutButton />
          </div>
        </div>
      </aside>

      <div className="min-h-screen lg:ml-64">
        <header className="sticky top-0 z-30 border-b border-slate-200/50 bg-slate-50/80 shadow-sm backdrop-blur-md">
          <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4 lg:gap-6">
              <span className="font-headline text-xl font-bold tracking-tight text-slate-900">
                Dropship Control
              </span>
              <div className="relative hidden md:block">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                  search
                </span>
                <input
                  type="text"
                  readOnly
                  value=""
                  placeholder="Busca global..."
                  className="w-64 rounded-lg border-none bg-[var(--surface-container-low)] py-2 pl-10 pr-4 text-sm text-slate-700 outline-none ring-0 placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <button
                type="button"
                className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <span className="material-symbols-outlined">notifications</span>
              </button>
              <button
                type="button"
                className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <span className="material-symbols-outlined">help</span>
              </button>
              <div className="hidden h-8 w-px bg-slate-200 sm:block" />
              <div className="flex items-center gap-3">
                <div className="hidden text-right sm:block">
                  <p className="text-xs font-bold text-slate-900">{userName}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Control System
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[var(--primary-container)] bg-[var(--surface-container-low)] text-sm font-bold text-[var(--primary)]">
                  {getInitials(session?.user?.name, session?.user?.email)}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1600px] space-y-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                  Operational Pulse
                </p>
                <h2 className="mt-2 font-headline text-4xl font-extrabold tracking-tight text-slate-900">
                  {title}
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--on-surface-variant)]">
                  {description}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 rounded-lg bg-[var(--surface-container-high)] px-4 py-2 text-sm font-semibold text-[var(--on-secondary-container)]">
                  <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                  Hoje, {todayLabel}
                </div>
                <div className="rounded-lg bg-[var(--surface-container-lowest)] px-4 py-2 text-sm font-semibold text-slate-900 shadow-[0_12px_30px_rgba(42,52,57,0.06)]">
                  Sprint Fase 5
                </div>
              </div>
            </div>

            <div className="space-y-6">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}

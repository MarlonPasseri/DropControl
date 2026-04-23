import Link from "next/link";
import Image from "next/image";
import { ReactNode } from "react";
import { auth } from "@/auth";
import { SidebarNav } from "@/components/sidebar-nav";
import { SignOutButton } from "@/components/sign-out-button";
import { getUserById } from "@/lib/data/users";
import { getNavigationItemsForRole } from "@/lib/mvp-data";
import { getRoleLabel, resolveAppRoleForUser } from "@/lib/security/roles";

function getInitials(name?: string | null, email?: string | null) {
  const seed = name?.trim() || email?.trim() || "Operador";
  const [first = "", second = ""] = seed.split(/\s+/);
  return `${first[0] ?? ""}${second[0] ?? ""}`.toUpperCase() || "OP";
}

function UserAvatar({
  name,
  email,
  image,
  size = "md",
}: {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  size?: "sm" | "md";
}) {
  const sizeClass = size === "sm" ? "h-9 w-9 text-sm" : "h-10 w-10 text-sm";

  if (image) {
    return (
      <Image
        src={image}
        alt={`Foto de ${name || email || "usuario"}`}
        width={size === "sm" ? 36 : 40}
        height={size === "sm" ? 36 : 40}
        unoptimized
        className={`${sizeClass} rounded-full object-cover ring-1 ring-[var(--outline-variant)]`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full bg-[var(--primary-container)] font-bold text-[var(--primary)]`}
    >
      {getInitials(name, email)}
    </div>
  );
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
  const profile = session?.user?.id ? await getUserById(session.user.id) : null;
  const userName = profile?.name ?? session?.user?.name ?? "Operador principal";
  const userEmail = profile?.email ?? session?.user?.email ?? "Sessao protegida";
  const userImage = profile?.image ?? session?.user?.image;
  const userRole = profile ? await resolveAppRoleForUser(profile) : "OPERATOR";
  const navigationItems = getNavigationItemsForRole(userRole);
  const quickLinks = navigationItems.filter((item) =>
    ["/orders", "/finance", "/tasks", "/products"].includes(item.href),
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="z-40 flex w-full flex-col border-b border-[var(--surface-container-highest)] bg-white py-4 lg:fixed lg:inset-y-0 lg:left-0 lg:w-72 lg:border-b-0 lg:border-r">
        <div className="px-4">
          <div className="rounded-lg border border-[var(--outline-variant)] bg-[linear-gradient(160deg,rgba(23,107,99,0.08)_0%,rgba(23,107,99,0.02)_52%,rgba(255,255,255,1)_100%)] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--primary)] text-[var(--on-primary)] shadow-[0_12px_30px_rgba(23,107,99,0.22)]">
                <span className="material-symbols-outlined text-lg">dashboard</span>
              </div>
              <div>
                <h1 className="font-headline text-base font-extrabold tracking-tight text-slate-950">
                  DropControl
                </h1>
                <p className="text-xs font-medium text-[var(--on-surface-variant)]">
                  Mesa de operacao
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--primary-container)] px-3 py-1 text-xs font-semibold text-[var(--on-primary-container)]">
                <span className="material-symbols-outlined text-[15px]">verified_user</span>
                {getRoleLabel(userRole)}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-container-low)] px-3 py-1 text-xs font-semibold text-[var(--on-secondary-container)]">
                <span className="material-symbols-outlined text-[15px]">lock</span>
                Ambiente privado
              </span>
            </div>
          </div>
        </div>

        <SidebarNav items={navigationItems} />

        <div className="mt-4 space-y-3 px-4">
          <Link
            href="/orders"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-[var(--on-primary)] shadow-[0_16px_36px_rgba(23,107,99,0.22)] hover:bg-[var(--primary-dim)]"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            Novo pedido
          </Link>

          <div className="rounded-lg border border-[var(--outline-variant)] bg-[var(--surface-container-lowest)] p-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--on-surface-variant)]">
              Atalhos
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {quickLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg border border-[var(--outline-variant)] bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"
                >
                  {item.shortLabel}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-auto px-4 pt-6">
          <Link
            href="/profile"
            className="block rounded-lg border border-[var(--outline-variant)] bg-[var(--surface-container-lowest)] p-3 transition hover:border-[var(--primary)]"
          >
            <div className="flex items-center gap-3">
              <UserAvatar name={userName} email={userEmail} image={userImage} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-950">{userName}</p>
                <p className="truncate text-xs text-[var(--on-surface-variant)]">{userEmail}</p>
              </div>
            </div>
          </Link>

          <div className="mt-4 space-y-1">
            <details className="group relative">
              <summary className="flex cursor-pointer list-none items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-[var(--on-surface-variant)] outline-none hover:bg-[var(--surface-container-low)] hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-[var(--primary)] [&::-webkit-details-marker]:hidden">
                <span className="material-symbols-outlined text-[20px]">headset_mic</span>
                <span>Suporte</span>
              </summary>
              <div className="absolute bottom-full left-0 z-50 mb-2 w-full rounded-lg border border-[var(--outline-variant)] bg-white p-3 text-sm shadow-lg">
                <p className="text-xs font-semibold uppercase text-[var(--on-surface-variant)]">
                  Email de suporte
                </p>
                <a
                  href="mailto:dropcontrol@gmail.com"
                  className="mt-1 block break-all font-semibold text-[var(--primary)] hover:underline"
                >
                  dropcontrol@gmail.com
                </a>
              </div>
            </details>
            <SignOutButton />
          </div>
        </div>
      </aside>

      <div className="min-h-screen lg:ml-72">
        <header className="sticky top-0 z-30 border-b border-[var(--surface-container-highest)] bg-[color:rgba(255,255,255,0.88)] backdrop-blur-md">
          <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-950">{title}</p>
                <p className="hidden text-xs text-[var(--on-surface-variant)] sm:block">
                  Painel privado com foco em leitura rapida e execucao diaria
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden items-center gap-2 rounded-full border border-[var(--outline-variant)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--on-secondary-container)] sm:flex">
                  <span className="material-symbols-outlined text-[18px]">shield_lock</span>
                  Privado
                </div>
                <div className="flex items-center gap-3">
                  <div className="hidden text-right sm:block">
                    <p className="text-xs font-semibold text-slate-900">{userName}</p>
                    <p className="text-xs text-[var(--on-surface-variant)]">
                      {getRoleLabel(userRole)} - {userEmail}
                    </p>
                  </div>
                  <Link href="/profile" aria-label="Abrir perfil">
                    <UserAvatar name={userName} email={userEmail} image={userImage} size="sm" />
                  </Link>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {quickLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full border border-[var(--outline-variant)] bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1600px] space-y-6">
            <div className="flex flex-col gap-4 rounded-lg border border-[var(--outline-variant)] bg-white px-5 py-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)] lg:flex-row lg:items-end lg:justify-between lg:px-6">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--on-surface-variant)]">
                  Workspace
                </p>
                <h2 className="mt-2 font-headline text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
                  {title}
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--on-surface-variant)]">
                  {description}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-[var(--surface-container-low)] px-4 py-3">
                  <p className="text-xs font-semibold text-[var(--on-surface-variant)]">Conta</p>
                  <p className="mt-1 text-sm font-semibold text-slate-950">{userName}</p>
                </div>
                <div className="rounded-lg bg-[var(--surface-container-low)] px-4 py-3">
                  <p className="text-xs font-semibold text-[var(--on-surface-variant)]">
                    Acesso
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-950">
                    {getRoleLabel(userRole)}
                  </p>
                </div>
                <div className="rounded-lg bg-[var(--surface-container-low)] px-4 py-3">
                  <p className="text-xs font-semibold text-[var(--on-surface-variant)]">
                    Contexto
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-950">Operacao diaria</p>
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

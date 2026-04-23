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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="z-40 flex w-full flex-col border-b border-[var(--surface-container-highest)] bg-white py-4 lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:border-b-0 lg:border-r">
        <div className="px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[var(--primary)] text-[var(--on-primary)]">
              <span className="material-symbols-outlined text-lg">dashboard</span>
            </div>
            <div>
              <h1 className="font-headline text-base font-extrabold tracking-tight text-slate-950">
                DropControl
              </h1>
              <p className="text-xs font-medium text-[var(--on-surface-variant)]">
                Painel operacional
              </p>
            </div>
          </div>
        </div>

        <SidebarNav items={navigationItems} />

        <div className="mt-4 px-4">
          <Link
            href="/orders"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--outline-variant)] bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:border-[var(--primary)] hover:text-[var(--primary)]"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            Novo pedido
          </Link>
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

      <div className="min-h-screen lg:ml-64">
        <header className="sticky top-0 z-30 border-b border-[var(--surface-container-highest)] bg-[color:rgba(255,255,255,0.88)] backdrop-blur-md">
          <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-2.5 sm:px-6 lg:px-8">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-950">{title}</p>
              <p className="hidden text-xs text-[var(--on-surface-variant)] sm:block">
                Ambiente privado
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 rounded-md border border-[var(--outline-variant)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--on-secondary-container)] sm:flex">
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
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1600px] space-y-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="font-headline text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
                  {title}
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--on-surface-variant)]">
                  {description}
                </p>
              </div>
            </div>

            <div className="space-y-6">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}

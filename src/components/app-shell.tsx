import { ReactNode } from "react";
import { auth } from "@/auth";
import { SidebarNav } from "@/components/sidebar-nav";
import { SignOutButton } from "@/components/sign-out-button";

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

  return (
    <div className="min-h-screen bg-[#f4f6f3] text-slate-950">
      <div className="mx-auto grid min-h-screen max-w-[1600px] lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="border-b border-slate-200 bg-slate-950 px-5 py-6 text-slate-100 lg:border-b-0 lg:border-r">
          <div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-300">
                Dropship Control
              </p>
              <h1 className="mt-2 text-xl font-semibold">MVP operacional</h1>
            </div>
          </div>

          <SidebarNav />

          <div className="mt-8 rounded-lg border border-slate-800 bg-slate-900 p-4">
            <p className="text-sm font-semibold text-white">Sessao ativa</p>
            <div className="mt-3 space-y-1 text-sm text-slate-300">
              <p>{session?.user?.name ?? "Operador"}</p>
              <p className="break-all text-slate-400">{session?.user?.email ?? "Sem e-mail"}</p>
            </div>
            <div className="mt-4">
              <SignOutButton />
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-slate-800 bg-slate-900 p-4">
            <p className="text-sm font-semibold text-white">Alertas do MVP</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              <li>Pedido sem atualizacao ha 3+ dias</li>
              <li>Margem abaixo do minimo esperado</li>
              <li>Fornecedor com alta taxa de problema</li>
              <li>Tarefa vencida ou proxima do prazo</li>
            </ul>
          </div>
        </aside>

        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <header className="mb-6 flex flex-wrap items-start justify-between gap-4 rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Blueprint interativo
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">{title}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
            </div>
            <div className="grid min-w-[220px] gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="font-medium text-slate-700">Usuario</p>
                <p className="mt-1 text-slate-500">{session?.user?.name ?? "Operador principal"}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="font-medium text-slate-700">Sprint atual</p>
                <p className="mt-1 text-slate-500">Fase 5 - alertas e refinamento</p>
              </div>
            </div>
          </header>
          <div className="space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

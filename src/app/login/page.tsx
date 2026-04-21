import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "@/app/login/login-form";
import { RegisterForm } from "@/app/login/register-form";
import { getUserCount } from "@/lib/data/users";

export default async function LoginPage() {
  const [session, totalUsers] = await Promise.all([auth(), getUserCount()]);
  const isGoogleAuthEnabled = Boolean(
    process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
  );

  if (session?.user) {
    redirect("/dashboard");
  }

  const isPublicRegistrationOpen = totalUsers === 0;

  return (
    <main className="min-h-screen bg-background p-4 text-foreground sm:p-6">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-7xl overflow-hidden rounded-lg border border-[var(--surface-container-highest)] bg-[var(--surface-container-lowest)] shadow-[0_28px_80px_rgba(31,45,40,0.08)] lg:min-h-[calc(100vh-3rem)] lg:grid-cols-12">
        <section className="relative hidden overflow-hidden bg-[var(--foreground)] lg:col-span-7 lg:flex lg:flex-col lg:justify-between lg:p-12">
          <div className="absolute inset-0">
            <Image
              src="/media/ops-desk.jpg"
              alt="Mesa de operacao com notebooks e indicadores"
              fill
              priority
              sizes="(min-width: 1024px) 58vw, 100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(18,55,52,0.96)_0%,rgba(18,55,52,0.82)_38%,rgba(185,95,66,0.60)_100%)]" />
          </div>

          <div className="relative z-10 flex items-center gap-3">
            <div className="signature-gradient flex h-10 w-10 items-center justify-center rounded-md text-[var(--on-primary)] shadow-[0_10px_24px_rgba(16,55,52,0.24)]">
              <span className="material-symbols-outlined text-[20px]">terminal</span>
            </div>
            <span className="font-headline text-xl font-bold tracking-tight text-white">
              Dropship Control
            </span>
          </div>

          <div className="relative z-10 mt-auto max-w-xl">
            <div className="flex flex-wrap gap-2">
              {["Operacao privada", "Sessao limitada", "Acesso monitorado"].map((label) => (
                <span
                  key={label}
                  className="rounded-md border border-white/16 bg-white/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/86 backdrop-blur-sm"
                >
                  {label}
                </span>
              ))}
            </div>
            <h1 className="mt-6 font-headline text-4xl font-extrabold leading-tight text-white">
              Entre, acompanhe o fluxo e mantenha a operacao sob controle.
            </h1>
            <p className="mt-4 max-w-lg text-base leading-7 text-white/78">
              Pedidos, notas fiscais, fornecedores e caixa ficam alinhados dentro
              do mesmo ambiente protegido.
            </p>
          </div>
        </section>

        <section className="col-span-1 flex flex-col justify-center bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(240,248,243,0.94)_100%)] p-8 md:p-12 lg:col-span-5 lg:p-14">
          <div className="mb-10 lg:hidden">
            <div className="flex items-center gap-2">
              <div className="signature-gradient flex h-8 w-8 items-center justify-center rounded-md text-[var(--on-primary)]">
                <span className="material-symbols-outlined text-[18px]">terminal</span>
              </div>
              <span className="font-headline text-lg font-bold tracking-tight text-slate-900">
                Dropship Control
              </span>
            </div>
          </div>

          <div className="space-y-10">
            <div className="space-y-6">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--on-surface-variant)]">
                  Acesso seguro
                </p>
                <h2 className="mt-2 font-headline text-3xl font-bold text-slate-900">
                  Entrar
                </h2>
                <p className="mt-2 text-sm text-[var(--on-surface-variant)]">
                  Use uma conta de operador autorizada para abrir o painel.
                </p>
              </div>

              <LoginForm isGoogleAuthEnabled={isGoogleAuthEnabled} />
            </div>

            <div className="rounded-lg border border-[var(--surface-container-highest)] bg-[var(--surface-container-low)] p-6 shadow-[0_14px_32px_rgba(31,45,40,0.06)]">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--on-surface-variant)]">
                  Primeiro acesso
                </p>
                <h2 className="mt-2 font-headline text-2xl font-bold text-slate-900">
                  {isPublicRegistrationOpen
                    ? "Criar conta inicial"
                    : "Cadastro inicial encerrado"}
                </h2>
                <p className="mt-3 text-sm leading-6 text-[var(--on-surface-variant)]">
                  {isPublicRegistrationOpen
                    ? "Cadastre o primeiro operador antes de liberar o restante do ambiente."
                    : "O primeiro operador ja foi criado. Novas contas devem ser liberadas internamente."}
                </p>
              </div>

              {isPublicRegistrationOpen ? (
                <div className="mt-6">
                  <RegisterForm />
                </div>
              ) : (
                <div className="mt-6 rounded-lg border border-[var(--surface-container-highest)] bg-[var(--surface-container-lowest)] p-4 text-sm leading-6 text-[var(--on-surface-variant)]">
                  Entre com a conta principal para seguir com a operacao.
                </div>
              )}

              <div className="mt-6 rounded-lg border border-[var(--surface-container-highest)] bg-[var(--surface-container-lowest)] p-4 text-sm leading-6 text-[var(--on-surface-variant)]">
                Ambientes novos pedem <span className="font-semibold">DATABASE_URL</span> e{" "}
                <span className="font-semibold">AUTH_SECRET</span> configurados antes do
                primeiro acesso.
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

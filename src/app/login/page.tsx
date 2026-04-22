import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "@/app/login/login-form";
import { RegisterForm } from "@/app/login/register-form";

export default async function LoginPage() {
  const session = await auth();
  const isGoogleAuthEnabled = Boolean(
    process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
  );

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-background p-4 text-foreground sm:p-6">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-7xl overflow-hidden rounded-lg border border-[var(--outline-variant)] bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)] lg:min-h-[calc(100vh-3rem)] lg:grid-cols-12">
        <section className="relative hidden overflow-hidden bg-slate-950 lg:col-span-7 lg:flex lg:flex-col lg:justify-between lg:p-12">
          <div className="absolute inset-0">
            <Image
              src="/media/ops-desk.jpg"
              alt="Mesa de operacao com notebooks e indicadores"
              fill
              priority
              sizes="(min-width: 1024px) 58vw, 100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(15,23,42,0.94)_0%,rgba(15,23,42,0.82)_48%,rgba(23,107,99,0.62)_100%)]" />
          </div>

          <div className="relative z-10 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[var(--primary)] text-[var(--on-primary)]">
              <span className="material-symbols-outlined text-[20px]">terminal</span>
            </div>
            <span className="font-headline text-xl font-bold tracking-tight text-white">
              Dropship Control
            </span>
          </div>

          <div className="relative z-10 mt-auto max-w-xl">
            <p className="text-sm font-semibold text-white/70">Operacao protegida</p>
            <h1 className="mt-4 font-headline text-4xl font-extrabold leading-tight text-white">
              Pedidos, fornecedores e caixa no mesmo painel.
            </h1>
            <p className="mt-4 max-w-lg text-base leading-7 text-white/78">
              Acompanhe atrasos, margens, notas fiscais e tarefas com um fluxo privado para a rotina de dropshipping.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {["Pedidos criticos", "Lucro mensal", "Tarefas do dia"].map((label) => (
                <div
                  key={label}
                  className="rounded-lg border border-white/14 bg-white/8 px-3 py-3 text-sm font-semibold text-white/86"
                >
                  {label}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="col-span-1 flex flex-col justify-center bg-white p-8 md:p-12 lg:col-span-5 lg:p-14">
          <div className="mb-10 lg:hidden">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--primary)] text-[var(--on-primary)]">
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
                <h2 className="font-headline text-3xl font-bold text-slate-950">
                  Entrar
                </h2>
                <p className="mt-2 text-sm text-[var(--on-surface-variant)]">
                  Use sua conta autorizada para abrir o painel.
                </p>
              </div>

              <LoginForm isGoogleAuthEnabled={isGoogleAuthEnabled} />
            </div>

            <div className="rounded-lg border border-[var(--outline-variant)] bg-[var(--surface-container-lowest)] p-5">
              <div>
                <h2 className="font-headline text-xl font-bold text-slate-950">
                  Criar conta
                </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--on-surface-variant)]">
                  Cadastre-se com Google ou crie uma conta manual usando e-mail e senha.
                </p>
              </div>

              <div className="mt-6">
                <RegisterForm isGoogleAuthEnabled={isGoogleAuthEnabled} />
              </div>

              <div className="mt-5 rounded-lg border border-[var(--outline-variant)] bg-white p-4 text-sm leading-6 text-[var(--on-surface-variant)]">
                O cadastro precisa de <span className="font-semibold">DATABASE_URL</span> e{" "}
                <span className="font-semibold">AUTH_SECRET</span> configurados antes do
                acesso.
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

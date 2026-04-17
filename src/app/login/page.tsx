import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "@/app/login/login-form";
import { RegisterForm } from "@/app/login/register-form";

export default async function LoginPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-background p-6 text-foreground">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl overflow-hidden rounded-lg bg-[var(--surface-container-lowest)] shadow-[0_20px_40px_rgba(42,52,57,0.06)] lg:grid-cols-12">
        <section className="relative hidden overflow-hidden bg-slate-950 lg:col-span-7 lg:flex lg:flex-col lg:justify-between lg:p-12">
          <div className="absolute inset-0">
            <Image
              src="/media/ops-desk.jpg"
              alt="Mesa de operacao com notebooks e indicadores"
              fill
              priority
              sizes="(min-width: 1024px) 58vw, 100vw"
              className="object-cover grayscale"
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-950/85 to-slate-950/35" />
          </div>

          <div className="relative z-10 flex items-center gap-3">
            <div className="signature-gradient flex h-10 w-10 items-center justify-center rounded text-[var(--on-primary)]">
              <span className="material-symbols-outlined text-[20px]">terminal</span>
            </div>
            <span className="font-headline text-xl font-bold tracking-tight text-white">
              Dropship Control
            </span>
          </div>

          <div className="relative z-10 mt-auto max-w-md">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-300">
              Control Center
            </p>
            <h1 className="mt-4 font-headline text-4xl font-extrabold leading-tight text-white">
              Retome o comando da operacao com clareza.
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-300">
              Login, cadastro inicial e rotas protegidas dentro do mesmo painel
              operacional.
            </p>
          </div>
        </section>

        <section className="col-span-1 flex flex-col justify-center p-8 md:p-12 lg:col-span-5 lg:p-14">
          <div className="mb-10 lg:hidden">
            <div className="flex items-center gap-2">
              <div className="signature-gradient flex h-8 w-8 items-center justify-center rounded text-[var(--on-primary)]">
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
                  Use a conta do operador para acessar o painel.
                </p>
              </div>

              <LoginForm />
            </div>

            <div className="rounded-lg bg-[var(--surface-container-low)] p-6">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--on-surface-variant)]">
                  Primeiro acesso
                </p>
                <h2 className="mt-2 font-headline text-2xl font-bold text-slate-900">
                  Criar conta inicial
                </h2>
                <p className="mt-3 text-sm leading-6 text-[var(--on-surface-variant)]">
                  Cadastre o primeiro operador antes de ligar os demais modulos do
                  ambiente.
                </p>
              </div>

              <div className="mt-6">
                <RegisterForm />
              </div>

              <div className="mt-6 rounded-lg bg-[var(--surface-container-lowest)] p-4 text-sm text-[var(--on-surface-variant)]">
                Variaveis necessarias: <span className="font-semibold">DATABASE_URL</span>{" "}
                e <span className="font-semibold">AUTH_SECRET</span>.
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

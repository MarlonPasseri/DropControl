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
    <div className="min-h-screen bg-[#f4f6f3] px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.10)] xl:grid-cols-[0.92fr_1.08fr]">
        <section className="flex flex-col justify-between bg-slate-950 p-8 text-white lg:p-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-teal-300">
              Dropship Control
            </p>
            <h1 className="mt-4 max-w-sm text-4xl font-semibold leading-tight">
              Entre e retome o controle da operacao.
            </h1>
            <p className="mt-4 max-w-md text-sm leading-7 text-slate-300">
              Autenticacao, rotas protegidas e base pronta para ligar o CRUD real em
              cima do schema Prisma.
            </p>
          </div>

          <div className="mt-8 overflow-hidden rounded-lg border border-slate-800">
            <Image
              src="/media/ops-desk.jpg"
              alt="Mesa de operacao com notebooks e indicadores"
              width={1200}
              height={900}
              className="h-[320px] w-full object-cover"
            />
          </div>
        </section>

        <section className="px-6 py-10 sm:px-8 lg:px-12">
          <div className="grid gap-8 xl:grid-cols-2">
            <div className="space-y-6">
              <div>
                <p className="text-sm font-medium text-slate-500">Acesso seguro</p>
                <h2 className="mt-2 text-3xl font-semibold text-slate-950">Login</h2>
              </div>

              <LoginForm />

              <div className="flex items-center justify-between gap-3 text-sm">
                <p className="text-slate-500">Recuperacao de senha entra na proxima fase.</p>
                <p className="font-medium text-slate-950">Operacao pronta para login</p>
              </div>
            </div>

            <div className="space-y-6 rounded-lg border border-slate-200 bg-slate-50 p-6">
              <div>
                <p className="text-sm font-medium text-slate-500">Primeiro acesso</p>
                <h2 className="mt-2 text-3xl font-semibold text-slate-950">
                  Criar conta inicial
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Use este formulario para criar o primeiro operador do ambiente antes de
                  ligar os outros modulos do sistema.
                </p>
              </div>

              <RegisterForm />

              <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
                Variaveis necessarias: <span className="font-semibold">DATABASE_URL</span>{" "}
                e <span className="font-semibold">AUTH_SECRET</span>.
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

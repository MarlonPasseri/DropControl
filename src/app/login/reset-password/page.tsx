import Link from "next/link";
import {
  completePasswordReset,
  requestPasswordReset,
} from "@/app/login/actions";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstOf(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ResetPasswordPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const token = firstOf(params.token);
  const successMessage = firstOf(params.success);
  const errorMessage = firstOf(params.error);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground sm:p-6">
      <div className="w-full max-w-lg rounded-lg border border-[var(--outline-variant)] bg-white p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[var(--primary)] text-[var(--on-primary)]">
            <span className="material-symbols-outlined text-[20px]">password</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-950">Reset de senha</p>
            <p className="text-xs text-[var(--on-surface-variant)]">
              Fluxo protegido por token e expiracao
            </p>
          </div>
        </div>

        <div className="mt-6">
          <h1 className="font-headline text-3xl font-bold text-slate-950">
            {token ? "Defina uma nova senha" : "Recuperar acesso"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--on-surface-variant)]">
            {token
              ? "Use uma senha forte, com pelo menos 12 caracteres."
              : "Informe o e-mail da conta. Se ele existir, enviaremos um link seguro para redefinicao."}
          </p>
        </div>

        {successMessage ? (
          <p className="mt-6 rounded-lg bg-[color:rgba(213,227,252,0.45)] px-4 py-3 text-sm text-[var(--on-secondary-container)]">
            {successMessage}
          </p>
        ) : null}

        {errorMessage ? (
          <p className="mt-6 rounded-lg bg-[color:rgba(254,137,131,0.18)] px-4 py-3 text-sm text-[var(--error)]">
            {errorMessage}
          </p>
        ) : null}

        {token ? (
          <form action={completePasswordReset} className="mt-8 space-y-5">
            <input type="hidden" name="token" value={token} />

            <label className="block">
              <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--on-surface-variant)]">
                Nova senha
              </span>
              <input
                type="password"
                name="password"
                required
                minLength={12}
                maxLength={72}
                autoComplete="new-password"
                placeholder="Minimo de 12 caracteres"
                className="w-full rounded-lg border border-[var(--outline-variant)] bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-0 placeholder:text-[var(--outline)] transition focus:border-[var(--primary)]"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--on-surface-variant)]">
                Confirmar senha
              </span>
              <input
                type="password"
                name="confirmPassword"
                required
                minLength={12}
                maxLength={72}
                autoComplete="new-password"
                placeholder="Repita a nova senha"
                className="w-full rounded-lg border border-[var(--outline-variant)] bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-0 placeholder:text-[var(--outline)] transition focus:border-[var(--primary)]"
              />
            </label>

            <button
              type="submit"
              className="w-full rounded-lg bg-[var(--primary)] px-4 py-3.5 text-sm font-semibold text-[var(--on-primary)] transition hover:bg-[var(--primary-dim)]"
            >
              Salvar nova senha
            </button>
          </form>
        ) : (
          <form action={requestPasswordReset} className="mt-8 space-y-5">
            <label className="block">
              <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--on-surface-variant)]">
                E-mail
              </span>
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                maxLength={320}
                spellCheck={false}
                placeholder="voce@empresa.com"
                className="w-full rounded-lg border border-[var(--outline-variant)] bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-0 placeholder:text-[var(--outline)] transition focus:border-[var(--primary)]"
              />
            </label>

            <button
              type="submit"
              className="w-full rounded-lg bg-[var(--primary)] px-4 py-3.5 text-sm font-semibold text-[var(--on-primary)] transition hover:bg-[var(--primary-dim)]"
            >
              Enviar link seguro
            </button>
          </form>
        )}

        <div className="mt-6">
          <Link
            href="/login"
            className="text-sm font-semibold text-[var(--primary)] transition hover:text-[var(--primary-dim)]"
          >
            Voltar para o login
          </Link>
        </div>
      </div>
    </main>
  );
}

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { abortMfaChallenge, verifyMfaChallenge } from "@/app/security/actions";
import { getUserSecurityById } from "@/lib/data/users";
import {
  hasVerifiedMfaCookie,
  isMfaRequired,
} from "@/lib/security/mfa";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstOf(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function resolveCallbackUrl(rawValue: string | undefined) {
  if (!rawValue) {
    return "/dashboard";
  }

  if (rawValue.startsWith("/")) {
    return rawValue;
  }

  try {
    const url = new URL(rawValue);
    return `${url.pathname}${url.search}${url.hash}` || "/dashboard";
  } catch {
    return "/dashboard";
  }
}

export default async function MfaChallengePage({ searchParams }: PageProps) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const params = (await searchParams) ?? {};
  const callbackUrl = resolveCallbackUrl(firstOf(params.callbackUrl));
  const errorMessage = firstOf(params.error);
  const securityUser = await getUserSecurityById(session.user.id);
  const requiresMfa = isMfaRequired({
    role: session.user.role,
    mfaEnabled: securityUser?.mfaEnabled,
  });

  if (!requiresMfa) {
    redirect(callbackUrl);
  }

  if (hasVerifiedMfaCookie(await cookies(), session.user.id)) {
    redirect(callbackUrl);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground sm:p-6">
      <div className="w-full max-w-md rounded-lg border border-[var(--outline-variant)] bg-white p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[var(--primary)] text-[var(--on-primary)]">
            <span className="material-symbols-outlined text-[20px]">shield_lock</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-950">Segundo fator</p>
            <p className="text-xs text-[var(--on-surface-variant)]">Conta administrativa</p>
          </div>
        </div>

        <div className="mt-6">
          <h1 className="font-headline text-3xl font-bold text-slate-950">
            Confirme seu acesso
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--on-surface-variant)]">
            Digite o codigo de 6 digitos do aplicativo autenticador ou um recovery code ainda nao usado para liberar o painel.
          </p>
        </div>

        <form action={verifyMfaChallenge} className="mt-8 space-y-5">
          <input type="hidden" name="callbackUrl" value={callbackUrl} />

          <label className="block">
            <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--on-surface-variant)]">
              Codigo MFA
            </span>
            <input
              type="text"
              name="code"
              required
              inputMode="text"
              autoComplete="one-time-code"
              maxLength={32}
              placeholder="000000 ou XXXXX-XXXXX"
              className="w-full rounded-lg border border-[var(--outline-variant)] bg-white px-4 py-3 text-center text-lg font-semibold tracking-[0.2em] text-slate-900 outline-none transition focus:border-[var(--primary)]"
            />
          </label>

          {errorMessage ? (
            <p className="rounded-lg bg-[color:rgba(254,137,131,0.18)] px-4 py-3 text-sm text-[var(--error)]">
              {errorMessage}
            </p>
          ) : null}

          <button
            type="submit"
            className="w-full rounded-lg bg-[var(--primary)] px-4 py-3.5 text-sm font-semibold text-[var(--on-primary)] transition hover:bg-[var(--primary-dim)]"
          >
            Validar e entrar
          </button>
        </form>

        <form action={abortMfaChallenge} className="mt-3">
          <button
            type="submit"
            className="w-full rounded-lg border border-[var(--outline-variant)] bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:border-[var(--error)] hover:text-[var(--error)]"
          >
            Sair desta conta
          </button>
        </form>
      </div>
    </main>
  );
}

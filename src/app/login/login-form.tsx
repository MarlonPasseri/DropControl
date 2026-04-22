"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { authenticate, authenticateWithGoogle } from "@/app/login/actions";
import { initialFormState } from "@/app/login/form-state";

const authErrorMessages: Record<string, string> = {
  AccessDenied: "Conta Google nao autorizada para este ambiente.",
  Configuration: "Login Google nao configurado neste ambiente.",
};

export function LoginForm({
  isGoogleAuthEnabled,
}: {
  isGoogleAuthEnabled: boolean;
}) {
  const searchParams = useSearchParams();
  const rawCallbackUrl = searchParams.get("callbackUrl");
  const authError = searchParams.get("error");
  let callbackUrl = "/dashboard";

  if (rawCallbackUrl) {
    if (rawCallbackUrl.startsWith("/")) {
      callbackUrl = rawCallbackUrl;
    } else {
      try {
        const url = new URL(rawCallbackUrl);
        callbackUrl = `${url.pathname}${url.search}${url.hash}`;
      } catch {
        callbackUrl = "/dashboard";
      }
    }
  }

  const [state, formAction, isPending] = useActionState(
    authenticate,
    initialFormState,
  );
  const oauthErrorMessage = authError
    ? authErrorMessages[authError] ?? "Nao foi possivel entrar com Google agora."
    : null;

  return (
    <div className="space-y-5">
      <form action={authenticateWithGoogle}>
        <input type="hidden" name="redirectTo" value={callbackUrl} />
        <button
          type="submit"
          disabled={!isGoogleAuthEnabled}
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-[var(--outline-variant)] bg-white px-4 py-3.5 text-sm font-semibold text-slate-900 transition hover:border-slate-400 hover:bg-[var(--surface-container-lowest)] disabled:cursor-not-allowed disabled:bg-[var(--surface-container-low)] disabled:text-slate-400"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-base font-bold text-[#4285f4]">
            G
          </span>
          Entrar com Google
        </button>
      </form>

      {oauthErrorMessage ? (
        <p className="rounded-lg bg-[color:rgba(254,137,131,0.18)] px-4 py-3 text-sm text-[var(--error)]">
          {oauthErrorMessage}
        </p>
      ) : null}

      {!isGoogleAuthEnabled ? (
        <p className="rounded-lg bg-[var(--surface-container-low)] px-4 py-3 text-sm text-[var(--on-surface-variant)]">
          Configure AUTH_GOOGLE_ID e AUTH_GOOGLE_SECRET para liberar este acesso.
        </p>
      ) : null}

      <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--on-surface-variant)]">
        <span className="h-px flex-1 bg-[var(--surface-container-highest)]" />
        <span>ou</span>
        <span className="h-px flex-1 bg-[var(--surface-container-highest)]" />
      </div>

      <form action={formAction} className="space-y-5">
        <input type="hidden" name="redirectTo" value={callbackUrl} />

        <label className="block">
          <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--on-surface-variant)]">
            E-mail
          </span>
          <div className="relative">
            <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[var(--outline)]">
              mail
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
              placeholder="operador@dropshipcontrol.com"
              className="w-full rounded-lg border border-[var(--outline-variant)] bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none ring-0 placeholder:text-[var(--outline)] transition focus:border-[var(--primary)]"
            />
          </div>
        </label>

        <label className="block">
          <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--on-surface-variant)]">
            Senha
          </span>
          <div className="relative">
            <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[var(--outline)]">
              lock
            </span>
            <input
              type="password"
              name="password"
              required
              minLength={8}
              maxLength={72}
              autoComplete="current-password"
              placeholder="Digite sua senha"
              className="w-full rounded-lg border border-[var(--outline-variant)] bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none ring-0 placeholder:text-[var(--outline)] transition focus:border-[var(--primary)]"
            />
          </div>
        </label>

        {state.status === "error" ? (
          <p className="rounded-lg bg-[color:rgba(254,137,131,0.18)] px-4 py-3 text-sm text-[var(--error)]">
            {state.message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg bg-[var(--primary)] px-4 py-3.5 text-sm font-semibold text-[var(--on-primary)] transition hover:bg-[var(--primary-dim)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Entrando..." : "Entrar"}
        </button>

        <p className="text-sm text-[var(--on-surface-variant)]">
          Depois de algumas tentativas sem sucesso, o acesso entra em pausa por alguns minutos.
        </p>
      </form>
    </div>
  );
}

"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { authenticate } from "@/app/login/actions";
import { initialFormState } from "@/app/login/form-state";

export function LoginForm() {
  const searchParams = useSearchParams();
  const rawCallbackUrl = searchParams.get("callbackUrl");
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

  return (
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
            placeholder="operador@dropshipcontrol.com"
            className="w-full rounded-lg border-none bg-[var(--surface-container-low)] py-3 pl-10 pr-4 text-sm text-slate-900 outline-none ring-0 placeholder:text-[var(--outline)]"
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
            autoComplete="current-password"
            placeholder="Digite sua senha"
            className="w-full rounded-lg border-none bg-[var(--surface-container-low)] py-3 pl-10 pr-4 text-sm text-slate-900 outline-none ring-0 placeholder:text-[var(--outline)]"
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
        className="signature-gradient w-full rounded-lg px-4 py-4 text-sm font-semibold text-[var(--on-primary)] shadow-[0_12px_30px_rgba(86,94,116,0.18)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Entrando..." : "Entrar"}
      </button>

      <p className="text-sm text-[var(--on-surface-variant)]">
        Use a conta cadastrada abaixo para liberar o primeiro acesso.
      </p>
    </form>
  );
}

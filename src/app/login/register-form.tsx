"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { authenticateWithGoogle, registerOperator } from "@/app/login/actions";
import { initialFormState } from "@/app/login/form-state";

function resolveCallbackUrl(rawCallbackUrl: string | null) {
  if (!rawCallbackUrl) {
    return "/dashboard";
  }

  if (rawCallbackUrl.startsWith("/")) {
    return rawCallbackUrl;
  }

  try {
    const url = new URL(rawCallbackUrl);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/dashboard";
  }
}

export function RegisterForm({
  isGoogleAuthEnabled,
}: {
  isGoogleAuthEnabled: boolean;
}) {
  const searchParams = useSearchParams();
  const callbackUrl = resolveCallbackUrl(searchParams.get("callbackUrl"));
  const [state, formAction, isPending] = useActionState(
    registerOperator,
    initialFormState,
  );

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
          Cadastrar com Google
        </button>
      </form>

      {!isGoogleAuthEnabled ? (
        <p className="rounded-lg bg-white px-4 py-3 text-sm text-[var(--on-surface-variant)]">
          Configure AUTH_GOOGLE_ID e AUTH_GOOGLE_SECRET para liberar cadastro com Google.
        </p>
      ) : null}

      <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--on-surface-variant)]">
        <span className="h-px flex-1 bg-[var(--surface-container-highest)]" />
        <span>ou cadastro manual</span>
        <span className="h-px flex-1 bg-[var(--surface-container-highest)]" />
      </div>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="redirectTo" value={callbackUrl} />

        <label className="block">
          <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--on-surface-variant)]">
            Nome
          </span>
          <input
            type="text"
            name="name"
            required
            autoComplete="name"
            maxLength={80}
            placeholder="Seu nome"
            className="w-full rounded-lg border border-[var(--outline-variant)] bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-0 placeholder:text-[var(--outline)] transition focus:border-[var(--primary)]"
          />
        </label>

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

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--on-surface-variant)]">
              Senha
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
              placeholder="Repita a senha"
              className="w-full rounded-lg border border-[var(--outline-variant)] bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-0 placeholder:text-[var(--outline)] transition focus:border-[var(--primary)]"
            />
          </label>
        </div>

        {state.status !== "idle" ? (
          <p
            className={`rounded-lg px-4 py-3 text-sm ${
              state.status === "success"
                ? "bg-[color:rgba(213,227,252,0.45)] text-[var(--on-secondary-container)]"
                : "bg-[color:rgba(254,137,131,0.18)] text-[var(--error)]"
            }`}
          >
            {state.message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg border border-[var(--outline-variant)] bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:border-[var(--primary)] hover:text-[var(--primary)] disabled:cursor-not-allowed disabled:text-slate-400"
        >
          {isPending ? "Criando conta..." : "Cadastrar com e-mail e senha"}
        </button>
      </form>
    </div>
  );
}

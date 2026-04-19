"use client";

import { useActionState } from "react";
import { registerOperator } from "@/app/login/actions";
import { initialFormState } from "@/app/login/form-state";

export function RegisterForm() {
  const [state, formAction, isPending] = useActionState(
    registerOperator,
    initialFormState,
  );

  return (
    <form action={formAction} className="space-y-4">
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
          className="w-full rounded-lg border border-transparent bg-[var(--surface-container-lowest)] px-4 py-3 text-sm text-slate-900 outline-none ring-0 placeholder:text-[var(--outline)] transition focus:border-[var(--primary)]"
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
          className="w-full rounded-lg border border-transparent bg-[var(--surface-container-lowest)] px-4 py-3 text-sm text-slate-900 outline-none ring-0 placeholder:text-[var(--outline)] transition focus:border-[var(--primary)]"
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
            className="w-full rounded-lg border border-transparent bg-[var(--surface-container-lowest)] px-4 py-3 text-sm text-slate-900 outline-none ring-0 placeholder:text-[var(--outline)] transition focus:border-[var(--primary)]"
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
            className="w-full rounded-lg border border-transparent bg-[var(--surface-container-lowest)] px-4 py-3 text-sm text-slate-900 outline-none ring-0 placeholder:text-[var(--outline)] transition focus:border-[var(--primary)]"
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
        className="w-full rounded-lg bg-[var(--surface-container-lowest)] px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-white disabled:cursor-not-allowed disabled:text-slate-400"
      >
        {isPending ? "Criando conta..." : "Criar conta inicial"}
      </button>
    </form>
  );
}

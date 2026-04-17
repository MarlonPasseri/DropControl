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
        <span className="mb-2 block text-sm font-medium text-slate-700">Nome</span>
        <input
          type="text"
          name="name"
          required
          autoComplete="name"
          placeholder="Seu nome"
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-700">E-mail</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="voce@empresa.com"
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Senha</span>
          <input
            type="password"
            name="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="Minimo de 8 caracteres"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">
            Confirmar senha
          </span>
          <input
            type="password"
            name="confirmPassword"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="Repita a senha"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
          />
        </label>
      </div>

      {state.status !== "idle" ? (
        <p
          className={`rounded-lg border px-4 py-3 text-sm ${
            state.status === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-rose-200 bg-rose-50 text-rose-900"
          }`}
        >
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:border-slate-950 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
      >
        {isPending ? "Criando conta..." : "Criar conta inicial"}
      </button>
    </form>
  );
}

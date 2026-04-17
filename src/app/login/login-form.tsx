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
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="redirectTo" value={callbackUrl} />

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-700">E-mail</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="operador@dropshipcontrol.com"
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-700">Senha</span>
        <input
          type="password"
          name="password"
          required
          minLength={8}
          autoComplete="current-password"
          placeholder="Digite sua senha"
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
        />
      </label>

      {state.status === "error" ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {isPending ? "Entrando..." : "Entrar"}
      </button>

      <p className="text-sm text-slate-500">
        Use a conta criada abaixo para acessar o painel pela primeira vez.
      </p>
    </form>
  );
}

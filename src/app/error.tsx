"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#f4f6f3] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl rounded-lg border border-rose-200 bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-600">
          Erro inesperado
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-slate-950">
          A tela nao conseguiu carregar agora.
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Tente recarregar este trecho da aplicacao. Se continuar falhando, volte para o
          dashboard e siga dali.
        </p>
        {error.digest ? (
          <p className="mt-3 text-xs text-slate-400">Referencia tecnica: {error.digest}</p>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => unstable_retry()}
            className="rounded-lg bg-slate-950 px-4 py-3 text-sm font-semibold text-white"
          >
            Tentar de novo
          </button>
          <Link
            href="/dashboard"
            className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700"
          >
            Voltar ao dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

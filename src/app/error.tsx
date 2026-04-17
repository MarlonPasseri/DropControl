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
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl rounded-lg bg-[var(--surface-container-lowest)] p-6 shadow-[0_20px_40px_rgba(42,52,57,0.06)]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--error)]">
          Erro inesperado
        </p>
        <h1 className="mt-3 font-headline text-2xl font-bold text-slate-900">
          A tela nao conseguiu carregar agora.
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--on-surface-variant)]">
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
            className="signature-gradient rounded-lg px-4 py-3 text-sm font-semibold text-[var(--on-primary)]"
          >
            Tentar de novo
          </button>
          <Link
            href="/dashboard"
            className="rounded-lg bg-[var(--surface-container-low)] px-4 py-3 text-sm font-medium text-[var(--on-secondary-container)]"
          >
            Voltar ao dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

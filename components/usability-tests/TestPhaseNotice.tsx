"use client";

import { useEffect, useState } from "react";
import { isUsabilityTestsEnabled } from "@/usability-tests/config";

const STORAGE_KEY = "pedalconnect.test-phase-notice.v1";

export function TestPhaseNotice() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isUsabilityTestsEnabled()) return;
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") return;
    } catch {
      return;
    }
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  function acknowledge() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // O aviso deixa de ser exibido nesta sessão mesmo sem persistência.
    }
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[10050] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="test-phase-notice-title"
    >
      <div className="absolute inset-0 bg-black/45" aria-hidden />
      <div className="relative w-full max-w-md rounded-2xl border border-gray-200 bg-surface p-6 shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          Comunicado
        </p>
        <h2
          id="test-phase-notice-title"
          className="mt-2 text-lg font-semibold text-foreground"
        >
          O aplicativo encontra-se em fase de testes
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-text-secondary">
          Informamos que o PedalConnect está em fase de testes. A colaboração
          de cada usuário é de grande utilidade para o aprimoramento da
          plataforma.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-foreground">
          É de extrema importância que sejam concluídos os 10 testes de
          usabilidade e preenchido o formulário de avaliação e sugestão de melhorias. A realização
          dessas etapas é essencial para a validação do aplicativo e para o aprimoramento da plataforma com as sugestões dos usuários.
        </p>
        <button
          type="button"
          onClick={acknowledge}
          className="mt-6 w-full rounded-xl bg-gradient-to-r from-[#1B5E20] to-[#43A047] px-3 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          Estou ciente
        </button>
      </div>
    </div>
  );
}

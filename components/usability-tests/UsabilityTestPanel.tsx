"use client";

interface UsabilityTestPanelProps {
  guest: boolean;
  currentNumber: number | null;
  total: number;
  title: string;
  description: string;
  completedCount: number;
  skippedCount: number;
  finished: boolean;
  minimized: boolean;
  skipOpen: boolean;
  busy: boolean;
  hasFooter: boolean;
  onMinimize: () => void;
  onExpand: () => void;
  onSkipClick: () => void;
  onSkipCancel: () => void;
  onSkipConfirm: () => void;
}

export function UsabilityTestPanel({
  guest,
  currentNumber,
  total,
  title,
  description,
  completedCount,
  skippedCount,
  finished,
  minimized,
  skipOpen,
  busy,
  hasFooter,
  onMinimize,
  onExpand,
  onSkipClick,
  onSkipCancel,
  onSkipConfirm,
}: UsabilityTestPanelProps) {
  const bottom = hasFooter
    ? "bottom-[calc(4.25rem+env(safe-area-inset-bottom))]"
    : "bottom-4";
  const progressPct = Math.round((completedCount / total) * 100);
  const statusLabel = finished
    ? "Finalizado"
    : currentNumber
      ? `Em andamento`
      : "Pendente";

  if (minimized) {
    return (
      <button
        type="button"
        onClick={onExpand}
        className={`fixed ${bottom} left-3 z-[1050] max-w-[min(100%-5.5rem,20rem)] rounded-2xl border border-gray-200 bg-surface px-3 py-2 text-left shadow-lg shadow-black/10 ring-1 ring-black/5 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/30 sm:left-4`}
        aria-label="Expandir testes de usabilidade"
      >
        <p className="text-xs font-semibold text-foreground">
          🧪 Testes de Usabilidade
        </p>
        <p className="mt-0.5 text-[11px] text-text-secondary">
          {finished
            ? `${completedCount} de ${total} realizados`
            : `Teste ${currentNumber ?? "—"}/${total} • ${completedCount} concluídos`}
        </p>
      </button>
    );
  }

  return (
    <>
      <section
        className={`fixed ${bottom} left-3 right-3 z-[1050] max-h-[min(48vh,28rem)] overflow-y-auto rounded-2xl border border-gray-200 bg-surface p-4 shadow-xl shadow-black/10 ring-1 ring-black/5 sm:left-4 sm:right-auto sm:w-[min(100%-2rem,26rem)]`}
        aria-label="Testes de usabilidade"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Testes de Usabilidade
            </p>
            {!finished && currentNumber ? (
              <p className="mt-0.5 text-xs font-medium text-primary">
                Teste {currentNumber} de {total}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onMinimize}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-gray-100 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            aria-label="Minimizar testes de usabilidade"
          >
            <span className="text-lg leading-none">−</span>
          </button>
        </div>

        {finished ? (
          <div className="mt-3">
            <p className="text-base font-semibold text-foreground">
              🎉 Testes concluídos!
            </p>
            <p className="mt-2 text-sm text-text-secondary">
              Você finalizou os testes de usabilidade do PedalConnect.
            </p>
            <p className="mt-2 text-sm text-foreground">
              {completedCount} de {total} testes foram realizados.
            </p>
            {skippedCount > 0 ? (
              <p className="text-sm text-text-secondary">
                {skippedCount}{" "}
                {skippedCount === 1
                  ? "teste não foi realizado."
                  : "testes não foram realizados."}
              </p>
            ) : null}
            <p className="mt-3 text-sm font-medium text-primary">
              Obrigado pela participação!
            </p>
          </div>
        ) : (
          <>
            <h2 className="mt-3 text-sm font-semibold text-foreground">
              {title}
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-text-secondary">
              {description}
            </p>
            <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-text-secondary">
              Status: {statusLabel}
            </p>
          </>
        )}

        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-[11px] text-text-secondary">
            <span>
              {completedCount} de {total} concluídos
            </span>
            <span>{progressPct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#1B5E20] to-[#43A047] transition-[width] duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {!finished && !guest ? (
          <button
            type="button"
            onClick={onSkipClick}
            className="mt-4 w-full rounded-xl border border-gray-200 bg-background px-3 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-gray-50 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            Não consegui realizar
          </button>
        ) : null}
      </section>

      {skipOpen ? (
        <div
          className="fixed inset-0 z-[1400] flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="skip-test-title"
        >
          <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-surface p-5 shadow-xl">
            <h3
              id="skip-test-title"
              className="text-base font-semibold text-foreground"
            >
              Você não conseguiu realizar este teste?
            </h3>
            <p className="mt-2 text-sm text-text-secondary">
              Essa informação será registrada como parte da avaliação.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={onSkipCancel}
                disabled={busy}
                className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={onSkipConfirm}
                disabled={busy}
                className="flex-1 rounded-xl bg-gradient-to-r from-[#1B5E20] to-[#43A047] px-3 py-2.5 text-sm font-semibold text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
              >
                {busy ? "Salvando…" : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

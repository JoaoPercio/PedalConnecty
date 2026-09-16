"use client";

type ClarityConsentBannerProps = {
  onAccept: () => void;
  onDecline: () => void;
};

export function ClarityConsentBanner({
  onAccept,
  onDecline,
}: ClarityConsentBannerProps) {
  return (
    <div
      className="fixed left-3 right-3 top-[calc(0.75rem+env(safe-area-inset-top))] z-[1400] rounded-2xl border border-gray-200 bg-surface p-4 shadow-xl shadow-black/10 ring-1 ring-black/5 sm:left-auto sm:right-4 sm:w-[min(100%-2rem,24rem)]"
      role="dialog"
      aria-labelledby="clarity-consent-title"
    >
      <p
        id="clarity-consent-title"
        className="text-sm font-semibold text-foreground"
      >
        Avaliação de usabilidade (TCC)
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-text-secondary">
        Sua utilização do PedalConnect poderá ser registrada no Microsoft
        Clarity (cliques, navegação e gravação de tela) para a avaliação de
        usabilidade desta pesquisa. Senha, e-mail, mensagens de chat e outros
        dados pessoais são mascarados e não são usados para identificar você.
        Recusar não impede o uso do aplicativo.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onAccept}
          className="rounded-xl bg-gradient-to-r from-primary to-[#43A047] px-3 py-2 text-xs font-semibold text-white shadow-sm"
        >
          Aceitar registro
        </button>
        <button
          type="button"
          onClick={onDecline}
          className="rounded-xl border border-gray-200 bg-background px-3 py-2 text-xs font-semibold text-foreground"
        >
          Não registrar
        </button>
      </div>
    </div>
  );
}

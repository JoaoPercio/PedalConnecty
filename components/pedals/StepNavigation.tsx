"use client";

const STEPS = [
  "Informações básicas",
  "Rota",
  "Regras e limites",
  "Revisar e publicar",
];

interface StepNavigationProps {
  currentStep: number;
  onBack: () => void;
  onNext: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  nextLabel?: string;
  backLabel?: string;
  isSubmitting?: boolean;
  /** Shown while isSubmitting (default: "Publicando…") */
  submittingLabel?: string;
}

export function StepNavigation({
  currentStep,
  onBack,
  onNext,
  isFirstStep,
  isLastStep,
  nextLabel,
  backLabel = "Voltar",
  isSubmitting = false,
  submittingLabel = "Publicando…",
}: StepNavigationProps) {
  return (
    <div className="mt-8 flex flex-col gap-4">
      <div className="flex items-center justify-center gap-2 sm:gap-4">
        {STEPS.map((label, index) => {
          const step = index + 1;
          const isActive = currentStep === step;
          const isPast = currentStep > step;
          return (
            <div key={step} className="flex items-center">
              <div
                className={`
                  flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-medium transition-colors
                  ${isActive ? "bg-primary text-white shadow-md" : ""}
                  ${isPast ? "bg-primary/90 text-white" : ""}
                  ${!isActive && !isPast ? "bg-gray-200 text-text-secondary" : ""}
                `}
                aria-current={isActive ? "step" : undefined}
              >
                {isPast ? "✓" : step}
              </div>
              <span
                className={`
                  ml-2 hidden text-sm sm:inline
                  ${isActive ? "font-medium text-foreground" : "text-text-secondary"}
                `}
              >
                {label}
              </span>
              {index < STEPS.length - 1 && (
                <div
                  className={`
                    mx-1 h-0.5 w-6 rounded sm:mx-2 sm:w-10
                    ${isPast ? "bg-primary/50" : "bg-gray-200"}
                  `}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-between gap-4 border-t border-gray-200 pt-6">
        <div className="w-24">
          {!isFirstStep && (
            <button
              type="button"
              onClick={onBack}
              disabled={isSubmitting}
              className="rounded-xl border border-gray-200 bg-surface px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              {backLabel}
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onNext}
          disabled={isSubmitting}
          className="rounded-xl bg-gradient-to-r from-[#1B5E20] to-[#43A047] px-6 py-3 text-sm font-medium text-white shadow-md transition-opacity hover:opacity-95 disabled:opacity-50"
        >
          {isSubmitting
            ? submittingLabel
            : isLastStep
              ? (nextLabel ?? "Publicar pedal")
              : "Próximo"}
        </button>
      </div>
    </div>
  );
}

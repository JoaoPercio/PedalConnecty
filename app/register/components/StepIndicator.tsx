"use client";

const DEFAULT_STEPS = ["Dados pessoais", "Nível", "Conta"];

interface StepIndicatorProps {
  currentStep: number;
  /** Se omitido, usa o fluxo padrão de registo (inclui passo Conta). */
  labels?: string[];
}

export function StepIndicator({ currentStep, labels }: StepIndicatorProps) {
  const steps = labels ?? DEFAULT_STEPS;
  return (
    <div className="flex items-center justify-center gap-2 sm:gap-4 mb-8">
      {steps.map((label, index) => {
        const step = index + 1;
        const isActive = currentStep === step;
        const isPast = currentStep > step;
        return (
          <div key={step} className="flex items-center">
            <div
              className={`
                flex items-center justify-center w-9 h-9 rounded-full text-sm font-medium transition-colors
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
                ml-2 hidden sm:inline text-sm
                ${isActive ? "text-foreground font-medium" : "text-text-secondary"}
              `}
            >
              {label}
            </span>
            {index < steps.length - 1 && (
              <div
                className={`
                  w-6 sm:w-10 h-0.5 mx-1 sm:mx-2 rounded
                  ${isPast ? "bg-primary/50" : "bg-gray-200"}
                `}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

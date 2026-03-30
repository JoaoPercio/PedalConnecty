"use client";

const STEPS = ["Dados pessoais", "Nível", "Conta"];

interface StepIndicatorProps {
  currentStep: number;
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2 sm:gap-4 mb-8">
      {STEPS.map((label, index) => {
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
            {index < STEPS.length - 1 && (
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

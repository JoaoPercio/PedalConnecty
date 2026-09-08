"use client";

interface FilterSwitchProps {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  label: string;
}

export function FilterSwitch({
  checked,
  onCheckedChange,
  label,
}: FilterSwitchProps) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-gray-100 bg-background/80 px-3 py-2.5">
      <span className="text-sm text-foreground">{label}</span>
      <span className="relative inline-block h-7 w-12 shrink-0">
        <input
          type="checkbox"
          role="switch"
          className="peer sr-only"
          checked={checked}
          onChange={(e) => onCheckedChange(e.target.checked)}
        />
        <span
          className="absolute inset-0 rounded-full bg-gray-300 transition-colors peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40"
          aria-hidden
        />
        <span
          className="pointer-events-none absolute left-0.5 top-0.5 z-10 h-6 w-6 rounded-full bg-white shadow transition-transform duration-200 ease-out peer-checked:translate-x-[1.375rem]"
          aria-hidden
        />
      </span>
    </label>
  );
}

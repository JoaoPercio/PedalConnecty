type AuthDividerProps = {
  label?: string;
};

export function AuthDivider({ label = "ou" }: AuthDividerProps) {
  return (
    <div className="relative flex items-center justify-center py-1">
      <span className="absolute inset-x-0 top-1/2 h-px bg-gray-200" aria-hidden />
      <span className="relative bg-surface px-3 text-xs font-medium uppercase tracking-wide text-text-secondary">
        {label}
      </span>
    </div>
  );
}

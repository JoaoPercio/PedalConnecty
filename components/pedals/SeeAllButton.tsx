import { ChevronRightIcon } from "@/components/pedals/my-pedals-icons";

interface SeeAllButtonProps {
  expanded: boolean;
  onClick: () => void;
  expandLabel: string;
  collapseLabel?: string;
}

export function SeeAllButton({
  expanded,
  onClick,
  expandLabel,
  collapseLabel = "Ver menos",
}: SeeAllButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mx-auto flex items-center gap-1 text-sm font-semibold text-primary transition hover:text-secondary"
    >
      {expanded ? collapseLabel : expandLabel}
      <ChevronRightIcon
        className={`h-4 w-4 transition-transform ${expanded ? "rotate-90" : ""}`}
      />
    </button>
  );
}

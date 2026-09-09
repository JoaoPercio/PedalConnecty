import Link from "next/link";
import { ChevronRightIcon } from "@/components/pedals/my-pedals-icons";

interface MyPedalsEmptyStateProps {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
  tone?: "blue" | "green" | "gray";
}

const toneWrap: Record<
  NonNullable<MyPedalsEmptyStateProps["tone"]>,
  string
> = {
  blue: "border-blue-200 bg-blue-50/40",
  green: "border-primary/25 bg-primary/5",
  gray: "border-gray-200 bg-background/80",
};

export function MyPedalsEmptyState({
  title,
  description,
  actionHref,
  actionLabel,
  tone = "gray",
}: MyPedalsEmptyStateProps) {
  return (
    <div
      className={`rounded-2xl border-2 border-dashed px-5 py-6 ${toneWrap[tone]}`}
    >
      <p className="font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-sm text-text-secondary">{description}</p>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className={`mt-4 inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 ${
            tone === "blue"
              ? "bg-[#1E4E8C]"
              : "bg-gradient-to-r from-[#1B5E20] to-[#43A047]"
          }`}
        >
          {actionLabel}
          <ChevronRightIcon className="h-4 w-4" />
        </Link>
      ) : null}
    </div>
  );
}

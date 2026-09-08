import Link from "next/link";
import {
  CalendarIcon,
  CheckIcon,
  ChevronRightIcon,
  UsersIcon,
} from "@/components/pedals/my-pedals-icons";
import type { PedalSummary } from "@/lib/my-pedals";

function formatDate(date: string): string {
  try {
    return new Date(date).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return date;
  }
}

interface CompletedPedalRowProps {
  pedal: PedalSummary;
}

export function CompletedPedalRow({ pedal }: CompletedPedalRowProps) {
  const cap =
    pedal.max_participants != null
      ? `${pedal.approvedCount} / ${pedal.max_participants} participantes`
      : `${pedal.approvedCount} participantes`;

  return (
    <Link
      href={`/pedals/${pedal.id}`}
      className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-surface px-3 py-3 shadow-sm transition hover:border-primary/20 hover:shadow-md"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <CheckIcon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-foreground">
          {pedal.name}
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-text-secondary">
          <span className="inline-flex items-center gap-1">
            <CalendarIcon className="h-3.5 w-3.5" />
            {formatDate(pedal.date)}
          </span>
          <span className="inline-flex items-center gap-1">
            <UsersIcon className="h-3.5 w-3.5" />
            {cap}
          </span>
        </span>
      </span>
      <ChevronRightIcon className="h-5 w-5 shrink-0 text-gray-300" />
    </Link>
  );
}

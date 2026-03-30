"use client";

import Link from "next/link";
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

interface PedalSummaryCardProps {
  pedal: PedalSummary;
}

export function PedalSummaryCard({ pedal }: PedalSummaryCardProps) {
  const cap =
    pedal.max_participants != null
      ? `${pedal.approvedCount} / ${pedal.max_participants}`
      : `${pedal.approvedCount}`;

  return (
    <Link
      href={`/pedals/${pedal.id}`}
      className="block rounded-2xl border border-gray-100 bg-surface p-4 shadow-sm transition hover:border-primary/25 hover:shadow-md"
    >
      <h3 className="font-semibold text-foreground line-clamp-2">{pedal.name}</h3>
      <p className="mt-2 text-sm text-text-secondary">{formatDate(pedal.date)}</p>
      <p className="mt-1 text-sm text-foreground">
        <span className="text-text-secondary">Participantes: </span>
        {cap}
      </p>
    </Link>
  );
}

import type { PedalDifficulty } from "@/lib/pedals";
import type { EnrichedNearbyPedal } from "@/lib/pedal-filters";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;

export function formatPedalDateShort(iso: string): string {
  try {
    const d = new Date(iso);
    const day = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    const weekday = WEEKDAYS[d.getDay()];
    const time = d.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${day} (${weekday}) • ${time}`;
  } catch {
    return iso;
  }
}

export function difficultyShortLabel(diff: PedalDifficulty | null): string {
  if (!diff) return "—";
  if (diff === "iniciante") return "Fácil";
  if (diff === "intermediario") return "Moderado";
  if (diff === "avancado") return "Difícil";
  return diff;
}

export type PedalOccupancyBadge = "next" | "few" | "full" | "live";

export function pedalOccupancyBadge(input: {
  approvedCount: number;
  max_participants: number | null;
  status?: string;
}): PedalOccupancyBadge {
  if (input.status === "in_progress") return "live";
  if (
    input.max_participants != null &&
    input.approvedCount >= input.max_participants
  ) {
    return "full";
  }
  if (input.max_participants != null) {
    const remaining = input.max_participants - input.approvedCount;
    const ratio = remaining / input.max_participants;
    if (remaining <= 3 || ratio <= 0.15) return "few";
  }
  return "next";
}

export function availableSlotsLabel(pedal: EnrichedNearbyPedal): string {
  if (pedal.max_participants == null) {
    return "Vagas ilimitadas";
  }
  const available = Math.max(0, pedal.max_participants - pedal.approved_count);
  if (available === 0) return "Sem vagas";
  if (available === 1) return "1 vaga disponível";
  return `${available} vagas disponíveis`;
}

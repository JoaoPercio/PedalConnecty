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

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/**
 * Rótulo curto para o pin do mapa: "Hoje 17:39", "Amanhã 08:00", "Sáb 17:39"
 * (até 6 dias) ou "24/10" (mais longe).
 */
export function formatPinLabel(iso: string, now: Date = new Date()): string {
  try {
    const d = new Date(iso);
    const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const days = Math.round((startOfDay(d) - startOfDay(now)) / 86_400_000);
    if (days === 0) return `Hoje ${time}`;
    if (days === 1) return `Amanhã ${time}`;
    if (days > 1 && days < 7) return `${WEEKDAYS[d.getDay()]} ${time}`;
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  } catch {
    return "";
  }
}

export function difficultyShortLabel(diff: PedalDifficulty | null): string {
  if (!diff) return "—";
  if (diff === "iniciante") return "Iniciante";
  if (diff === "intermediario") return "Intermediário";
  if (diff === "avancado") return "Avançado";
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

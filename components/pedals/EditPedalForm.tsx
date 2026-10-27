"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  updatePedal,
  uploadPedalCover,
  toDatetimeLocalInput,
  type PedalDifficulty,
  type PedalTerrain,
  type PedalAgeGroup,
  type PedalVisibility,
} from "@/lib/pedals";
import { parseStoredRouteWaypoints } from "@/lib/route-waypoints";
import { regeneratePedalInviteCode } from "@/lib/pedal-detail-client";
import { PedalFormWizard, type PedalFormInitial, type PedalFormSubmit } from "./PedalFormWizard";
import type { RouteGeoJSON, RouteMapValue } from "./RouteMap";

function geojsonToRouteValue(
  route_geojson: unknown,
  route_waypoints?: unknown
): RouteMapValue {
  const wps = parseStoredRouteWaypoints(route_waypoints);
  const g = route_geojson as RouteGeoJSON | null;
  if (!g || g.type !== "LineString" || !Array.isArray(g.coordinates)) {
    return { geojson: null, coordinates: [], waypoints: wps };
  }
  const coordinates = g.coordinates.map(
    ([lng, lat]) => [lat, lng] as [number, number]
  );
  return { geojson: g, coordinates, waypoints: wps };
}

export interface PedalEditInitial {
  id: string;
  creator_id: string;
  name: string;
  description: string | null;
  date: string;
  start_location: string | null;
  start_lat: number | null;
  start_lng: number | null;
  end_lat: number | null;
  end_lng: number | null;
  distance_km: number | null;
  average_speed_kmh: number | null;
  elevation_gain: number | null;
  difficulty: PedalDifficulty | null;
  terrain: PedalTerrain | null;
  max_participants: number | null;
  requires_safety_equipment: boolean;
  required_equipment: string[];
  age_group: PedalAgeGroup | null;
  visibility: string;
  invite_code?: string | null;
  route_geojson: unknown;
  route_waypoints?: unknown;
  cover_image_url: string | null;
}

interface EditPedalFormProps {
  initial: PedalEditInitial;
}

export function EditPedalForm({ initial }: EditPedalFormProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState<string | null>(initial.invite_code ?? null);
  const [regeneratingInvite, setRegeneratingInvite] = useState(false);

  const formInitial = useMemo<PedalFormInitial>(
    () => ({
      name: initial.name,
      description: initial.description ?? "",
      date: toDatetimeLocalInput(initial.date),
      difficulty: initial.difficulty ?? "",
      terrain: initial.terrain ?? "",
      averageSpeedKmh:
        initial.average_speed_kmh != null ? String(initial.average_speed_kmh) : "",
      meetingPoint: initial.start_location ?? "",
      route: geojsonToRouteValue(initial.route_geojson, initial.route_waypoints),
      // 0 costuma ser resultado da antiga falha da API de elevação: recalcula.
      elevationGain: initial.elevation_gain ? initial.elevation_gain : null,
      maxParticipants: initial.max_participants != null ? String(initial.max_participants) : "",
      requiresSafetyEquipment:
        initial.requires_safety_equipment || (initial.required_equipment?.length ?? 0) > 0,
      requiredEquipment: initial.required_equipment ?? [],
      ageGroup: initial.age_group ?? "todas",
      visibility: (["public", "female_only", "private"].includes(initial.visibility)
        ? initial.visibility
        : "public") as PedalVisibility,
      coverUrl: initial.cover_image_url,
    }),
    [initial],
  );

  async function handleSubmit({
    fields,
    coverFile,
    removeCover,
  }: PedalFormSubmit): Promise<boolean> {
    if (!user) {
      toast.error("Faça login para salvar.");
      return false;
    }

    let coverUrl: string | null = removeCover ? null : initial.cover_image_url;
    if (coverFile) {
      const { coverImageUrl, error: uploadErr } = await uploadPedalCover(initial.id, coverFile);
      if (uploadErr || !coverImageUrl) {
        // Salva o resto mesmo assim, mantendo a capa anterior.
        toast.warning("Não foi possível enviar a nova imagem de capa.", {
          description: "As demais alterações serão salvas com a capa anterior.",
        });
      } else {
        coverUrl = coverImageUrl;
      }
    }

    const { error: updateErr } = await updatePedal(initial.id, {
      ...fields,
      cover_image_url: coverUrl,
    });
    if (updateErr) {
      toast.error("Não foi possível salvar as alterações. Tente novamente.", {
        description: updateErr.message,
      });
      return false;
    }

    toast.success("Alterações salvas!");
    router.replace(`/pedals/${initial.id}`);
    return true;
  }

  async function handleRegenerateInvite() {
    setRegeneratingInvite(true);
    const { code, error } = await regeneratePedalInviteCode(initial.id);
    setRegeneratingInvite(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (code) {
      setInviteCode(code);
      toast.success("Novo código gerado. O anterior deixa de funcionar.");
    }
  }

  if (!user) return null;

  const privateNotice = (
    <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
        Código de convite
      </p>
      {inviteCode ? (
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
          <code className="flex-1 rounded-lg bg-surface px-3 py-2 font-mono text-sm font-semibold tracking-wider">
            {inviteCode}
          </code>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(inviteCode).then(
                  () => toast.success("Código copiado"),
                  () => toast.error("Não foi possível copiar o código."),
                );
              }}
              className="rounded-lg border border-primary/30 px-3 py-2 text-sm font-semibold text-primary"
            >
              Copiar
            </button>
            <button
              type="button"
              disabled={regeneratingInvite}
              onClick={handleRegenerateInvite}
              className="rounded-lg border border-gray-300 bg-surface px-3 py-2 text-sm font-semibold text-foreground disabled:opacity-50"
            >
              {regeneratingInvite ? "Gerando…" : "Novo código"}
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-sm text-text-secondary">
          Será gerado automaticamente ao salvar como privado.
        </p>
      )}
    </div>
  );

  return (
    <PedalFormWizard
      mode="edit"
      initial={formInitial}
      exitHref={`/pedals/${initial.id}`}
      onSubmit={handleSubmit}
      privateNotice={privateNotice}
    />
  );
}

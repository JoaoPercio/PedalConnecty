"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  createPedal,
  uploadPedalCover,
  updatePedalCoverUrl,
  getElevationGain,
  calculateDistanceKm,
  getMinDatetimeLocalForPedal,
  validatePedalDatetimeLocal,
  type PedalDifficulty,
  type PedalTerrain,
  type PedalAgeGroup,
  type PedalVisibility,
} from "@/lib/pedals";
import {
  requestUserPosition,
  getMapCenter,
  MAP_INITIAL_VIEW_CENTER,
  LOCATION_PERMISSION_MESSAGE,
} from "@/lib/geolocation";
import { serializeWaypointsForDb } from "@/lib/route-waypoints";
import { StepNavigation } from "./StepNavigation";
import { EquipmentInput } from "./EquipmentInput";
import type { RouteMapValue } from "./RouteMap";

const RouteMap = dynamic(() => import("./RouteMap").then((m) => m.RouteMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-[400px] items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-text-secondary">
      Carregando mapa…
    </div>
  ),
});

const DIFFICULTY_OPTIONS: { value: PedalDifficulty; label: string }[] = [
  { value: "iniciante", label: "Iniciante" },
  { value: "intermediario", label: "Intermediário" },
  { value: "avancado", label: "Avançado" },
];

const TERRAIN_OPTIONS: { value: PedalTerrain; label: string }[] = [
  { value: "asfalto", label: "Asfalto" },
  { value: "terra", label: "Terra" },
  { value: "misto", label: "Misto" },
  { value: "trilha", label: "Trilha" },
];

const AGE_GROUP_OPTIONS: { value: PedalAgeGroup; label: string }[] = [
  { value: "todas", label: "Todas" },
  { value: "adultos", label: "Adultos" },
  { value: "melhor_idade", label: "Melhor idade" },
];

const VISIBILITY_OPTIONS: { value: PedalVisibility; label: string }[] = [
  { value: "public", label: "Público" },
  { value: "female_only", label: "Apenas mulheres" },
  { value: "private", label: "Privado" },
];

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-surface px-4 py-3 text-foreground placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-shadow text-base";
const labelClass = "mb-1.5 block text-sm font-medium text-foreground";

export function CreatePedalForm() {
  const { user } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [elevationLoading, setElevationLoading] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [difficulty, setDifficulty] = useState<PedalDifficulty | "">("");
  const [terrain, setTerrain] = useState<PedalTerrain | "">("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);

  const [routeValue, setRouteValue] = useState<RouteMapValue>({
    geojson: null,
    coordinates: [],
    waypoints: [],
  });
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [elevationGain, setElevationGain] = useState<number | null>(null);

  const [maxParticipants, setMaxParticipants] = useState<string>("");
  const [requiresSafetyEquipment, setRequiresSafetyEquipment] = useState(false);
  const [requiredEquipment, setRequiredEquipment] = useState<string[]>([]);
  const [ageGroup, setAgeGroup] = useState<PedalAgeGroup>("todas");
  const [visibility, setVisibility] = useState<PedalVisibility>("public");
  const [mapKey, setMapKey] = useState(0);
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  const prevStepRef = useRef(1);

  useEffect(() => {
    const prev = prevStepRef.current;
    prevStepRef.current = step;
    if (step === 2 || step === 4) {
      if (prev !== step) setMapKey((k) => k + 1);
    }
  }, [step]);

  useEffect(() => {
    if (step === 2) {
      setMapCenter((prev) => getMapCenter() ?? prev);
      requestUserPosition()
        .then((center) => setMapCenter(center))
        .catch(() => {
          window.alert(LOCATION_PERMISSION_MESSAGE);
          setMapCenter((prev) => prev ?? MAP_INITIAL_VIEW_CENTER);
        });
    }
  }, [step]);

  useEffect(() => {
    if (routeValue.coordinates.length >= 2) {
      setDistanceKm(calculateDistanceKm(routeValue.coordinates));
    } else {
      setDistanceKm(null);
    }
  }, [routeValue.coordinates]);

  useEffect(() => {
    if (coverFile) {
      const url = URL.createObjectURL(coverFile);
      setCoverPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setCoverPreviewUrl(null);
  }, [coverFile]);

  const scheduleDateError =
    date === "" ? null : validatePedalDatetimeLocal(date);
  const step1Valid =
    name.trim() !== "" &&
    date !== "" &&
    scheduleDateError === null &&
    difficulty !== "" &&
    terrain !== "";
  const step2Valid =
    routeValue.geojson !== null && routeValue.coordinates.length >= 2;

  const canProceed = (s: number) => {
    if (s === 1) return step1Valid;
    if (s === 2) return step2Valid;
    return true;
  };

  const fetchElevation = useCallback(async () => {
    if (routeValue.coordinates.length < 2) return;
    setElevationLoading(true);
    const { elevationGainM, error: err } = await getElevationGain(
      routeValue.coordinates
    );
    setElevationLoading(false);
    if (!err) setElevationGain(elevationGainM);
  }, [routeValue.coordinates]);

  const getStepValidationError = useCallback(
    (s: number): string | null => {
      if (s === 1) {
        if (!name.trim()) return "Informe o nome do pedal.";
        if (!date) return "Informe a data e hora do pedal.";
        const dateErr = validatePedalDatetimeLocal(date);
        if (dateErr) return dateErr;
        if (!difficulty) return "Selecione a dificuldade.";
        if (!terrain) return "Selecione o terreno.";
      }
      if (s === 2) {
        if (!routeValue.geojson || routeValue.coordinates.length < 2) {
          return "Desenhe a rota no mapa (mínimo 2 pontos) para continuar.";
        }
      }
      return null;
    },
    [name, date, difficulty, terrain, routeValue.geojson, routeValue.coordinates.length],
  );

  const handleNext = useCallback(async () => {
    setError(null);
    if (step === 2 && canProceed(2) && elevationGain === null) {
      await fetchElevation();
    }
    if (step < 4) {
      if (!canProceed(step)) {
        const msg = getStepValidationError(step);
        setError(msg ?? "Preencha todos os campos obrigatórios para continuar.");
        return;
      }
      setStep((s) => s + 1);
    } else {
      await handlePublish();
    }
  }, [step, step1Valid, step2Valid, elevationGain, fetchElevation, getStepValidationError]);

  const handleBack = useCallback(() => {
    setError(null);
    if (step > 1) setStep((s) => s - 1);
  }, [step]);

  async function handlePublish() {
    if (!user) {
      setError("Faça login para publicar.");
      return;
    }
    setSubmitting(true);
    setError(null);

    const dateValidation = validatePedalDatetimeLocal(date);
    if (dateValidation) {
      setError(dateValidation);
      setSubmitting(false);
      return;
    }

    const coords = routeValue.coordinates;
    const startLat = coords.length ? coords[0][0] : null;
    const startLng = coords.length ? coords[0][1] : null;
    const endLat = coords.length ? coords[coords.length - 1][0] : null;
    const endLng = coords.length ? coords[coords.length - 1][1] : null;

    const finalElevation =
      elevationGain ?? (await getElevationGain(coords)).elevationGainM;

    const { pedalId, error: createError } = await createPedal({
      creator_id: user.id,
      name: name.trim(),
      description: description.trim() || null,
      date: new Date(date).toISOString(),
      start_location: null,
      start_lat: startLat,
      start_lng: startLng,
      end_location: null,
      end_lat: endLat,
      end_lng: endLng,
      distance_km: distanceKm,
      elevation_gain: finalElevation,
      difficulty: difficulty || null,
      terrain: terrain || null,
      max_participants: maxParticipants ? parseInt(maxParticipants, 10) : null,
      requires_safety_equipment: requiresSafetyEquipment,
      required_equipment: requiredEquipment,
      age_group: ageGroup,
      visibility,
      route_geojson: routeValue.geojson,
      route_waypoints: serializeWaypointsForDb(routeValue.waypoints),
      cover_image_url: null,
    });

    if (createError || !pedalId) {
      setError(createError?.message ?? "Erro ao criar o pedal.");
      setSubmitting(false);
      return;
    }

    if (coverFile) {
      const { coverImageUrl, error: uploadErr } = await uploadPedalCover(
        pedalId,
        coverFile
      );
      if (!uploadErr && coverImageUrl) {
        await updatePedalCoverUrl(pedalId, coverImageUrl);
      }
    }

    setSubmitting(false);
    router.replace("/home");
  }

  if (!user) return null;

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <h1 className="mb-6 text-xl font-semibold text-foreground">
        Criar pedal
      </h1>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {error}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className={labelClass}>
              Nome do pedal *
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              placeholder="Ex: Pedal da manhã"
            />
          </div>
          <div>
            <label htmlFor="description" className={labelClass}>
              Descrição
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={inputClass}
              placeholder="Descreva o pedal..."
            />
          </div>
          <div>
            <label htmlFor="date" className={labelClass}>
              Data e hora *
            </label>
            <input
              id="date"
              type="datetime-local"
              value={date}
              min={getMinDatetimeLocalForPedal()}
              onChange={(e) => setDate(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="difficulty" className={labelClass}>
              Dificuldade *
            </label>
            <select
              id="difficulty"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as PedalDifficulty)}
              className={inputClass}
            >
              <option value="">Selecione</option>
              {DIFFICULTY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="terrain" className={labelClass}>
              Terreno *
            </label>
            <select
              id="terrain"
              value={terrain}
              onChange={(e) => setTerrain(e.target.value as PedalTerrain)}
              className={inputClass}
            >
              <option value="">Selecione</option>
              {TERRAIN_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Imagem de capa</label>
            <div className="flex flex-col gap-2">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-foreground file:mr-4 file:rounded-lg file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-primary"
              />
              {coverPreviewUrl && (
                <img
                  src={coverPreviewUrl}
                  alt="Preview capa"
                  className="h-32 w-full rounded-xl object-cover"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-surface p-4 text-sm text-foreground">
            <p className="font-medium text-foreground">
              Como desenhar a rota:
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-text-secondary">
              <li>
                Toque rápido ou clique para colocar um ponto; arraste com o dedo ou o
                mouse para mover o mapa
              </li>
              <li>Continue adicionando pontos ao longo do trajeto (mínimo 3)</li>
              <li>
                Para finalizar, toque de novo no último ponto ou use o botão
                &quot;Finalizar&quot;
              </li>
              <li>No celular, use dois dedos para aproximar ou afastar o mapa</li>
              <li>Use &quot;Desfazer&quot; se precisar corrigir o último ponto</li>
              <li>
                Depois de finalizar o traçado, use &quot;Adicionar parada no mapa&quot;
                para marcar postos ou outros pontos (com nome)
              </li>
            </ul>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            {routeValue.coordinates.length >= 2 && (
              <button
                type="button"
                onClick={() => {
                  setRouteValue({ geojson: null, coordinates: [], waypoints: [] });
                  setMapKey((k) => k + 1);
                }}
                className="rounded-xl border border-gray-200 bg-surface px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-gray-50"
              >
                Limpar rota
              </button>
            )}
          </div>
          <RouteMap
            key={`route-step-2-${mapKey}`}
            value={routeValue}
            onChange={setRouteValue}
            center={mapCenter ?? undefined}
          />
          {distanceKm !== null && (
            <p className="text-sm font-medium text-foreground">
              Distância: {distanceKm} km
            </p>
          )}
          {elevationLoading && (
            <p className="text-sm text-text-secondary">
              Calculando elevação…
            </p>
          )}
          {elevationGain !== null && !elevationLoading && (
            <p className="text-sm font-medium text-foreground">
              Ganho de elevação: {elevationGain} m
            </p>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div>
            <label htmlFor="maxParticipants" className={labelClass}>
              Máximo de participantes
            </label>
            <input
              id="maxParticipants"
              type="number"
              min={1}
              value={maxParticipants}
              onChange={(e) => setMaxParticipants(e.target.value)}
              className={inputClass}
              placeholder="Ex: 20"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="safety"
              type="checkbox"
              checked={requiresSafetyEquipment}
              onChange={(e) => setRequiresSafetyEquipment(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/30"
            />
            <label htmlFor="safety" className="text-sm text-foreground">
              Exige equipamento de segurança
            </label>
          </div>
          <EquipmentInput
            value={requiredEquipment}
            onChange={setRequiredEquipment}
          />
          <div>
            <label htmlFor="ageGroup" className={labelClass}>
              Faixa etária
            </label>
            <select
              id="ageGroup"
              value={ageGroup}
              onChange={(e) => setAgeGroup(e.target.value as PedalAgeGroup)}
              className={inputClass}
            >
              {AGE_GROUP_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="visibility" className={labelClass}>
              Visibilidade
            </label>
            <select
              id="visibility"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as PedalVisibility)}
              className={inputClass}
            >
              {VISIBILITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {visibility === "private" && (
              <p className="mt-2 text-sm text-text-secondary">
                Será criado um código de convite para partilhar. Quem tiver o código entra no pedal
                diretamente; não aparece no mapa de pedais perto.
              </p>
            )}
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4 rounded-xl border border-gray-200 bg-surface p-4">
          <p className="font-medium text-foreground">{name}</p>
          <p className="text-sm text-text-secondary">
            {date ? new Date(date).toLocaleString("pt-BR") : "—"}
          </p>
          <p className="text-sm text-foreground">
            Distância: {distanceKm ?? "—"} km
          </p>
          <p className="text-sm text-foreground">
            Elevação: {elevationGain ?? "—"} m
          </p>
          <p className="text-sm text-foreground">
            Dificuldade:{" "}
            {DIFFICULTY_OPTIONS.find((o) => o.value === difficulty)?.label ??
              "—"}
          </p>
          <p className="text-sm text-foreground">
            Terreno:{" "}
            {TERRAIN_OPTIONS.find((o) => o.value === terrain)?.label ?? "—"}
          </p>
          <p className="text-sm text-foreground">
            Máx. participantes: {maxParticipants || "Sem limite"}
          </p>
          {routeValue.geojson && (
            <div className="h-32 overflow-hidden rounded-lg border border-gray-200">
              <RouteMap
                key={`route-step-4-${mapKey}`}
                value={routeValue}
                onChange={() => {}}
                height="128px"
                readOnly
              />
            </div>
          )}
        </div>
      )}

      <StepNavigation
        currentStep={step}
        onBack={handleBack}
        onNext={handleNext}
        isFirstStep={step === 1}
        isLastStep={step === 4}
        nextLabel="Publicar pedal"
        isSubmitting={submitting}
      />
    </div>
  );
}

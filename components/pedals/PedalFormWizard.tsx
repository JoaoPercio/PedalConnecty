"use client";

import { useState, useEffect, useMemo, useRef, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  getElevationGain,
  calculateDistanceKm,
  getMinDatetimeLocalForPedal,
  validatePedalDatetimeLocal,
  validateAverageSpeedKmh,
  parseAverageSpeedKmh,
  type PedalDifficulty,
  type PedalTerrain,
  type PedalAgeGroup,
  type PedalVisibility,
  type PedalUpdateFields,
} from "@/lib/pedals";
import {
  requestUserPosition,
  getMapCenter,
  MAP_INITIAL_VIEW_CENTER,
  LOCATION_PERMISSION_MESSAGE,
} from "@/lib/geolocation";
import { serializeWaypointsForDb } from "@/lib/route-waypoints";
import { EquipmentInput } from "./EquipmentInput";
import {
  ChevronLeftIcon,
  RouteIcon,
  MountainIcon,
  GaugeIcon,
  UsersIcon,
  EyeIcon,
  LockIcon,
  ShieldIcon,
  PinIcon,
  ClockIcon,
} from "./pedal-detail-icons";
import { CheckIcon } from "./my-pedals-icons";
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

const VISIBILITY_OPTIONS: {
  value: PedalVisibility;
  label: string;
  hint: string;
  icon: (p: { className?: string }) => ReactNode;
}[] = [
  {
    value: "public",
    label: "Público",
    hint: "Aparece para todos no mapa de pedais perto.",
    icon: EyeIcon,
  },
  {
    value: "female_only",
    label: "Apenas mulheres",
    hint: "Aparece no mapa, mas só mulheres podem participar.",
    icon: UsersIcon,
  },
  {
    value: "private",
    label: "Privado",
    hint: "Não aparece no mapa. Só entra quem tiver o código de convite.",
    icon: LockIcon,
  },
];

const STEPS = [
  { title: "Informações básicas", subtitle: "Conte o essencial sobre o pedal." },
  { title: "Rota", subtitle: "Desenhe o trajeto e combine o ponto de encontro." },
  { title: "Regras e limites", subtitle: "Defina quem pode participar." },
  { title: "Revisar", subtitle: "Confira tudo antes de salvar." },
];

const NAME_MAX = 80;
const DESCRIPTION_MAX = 1000;
const COVER_MAX_BYTES = 5 * 1024 * 1024;
const MAX_PARTICIPANTS_LIMIT = 1000;

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-surface px-4 py-3 text-foreground placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-shadow text-base";
const labelClass = "mb-1.5 block text-sm font-medium text-foreground";
const hintClass = "mt-1.5 text-xs text-text-secondary";

const MODE_COPY = {
  create: {
    title: "Criar pedal",
    submit: "Publicar pedal",
    submitting: "Publicando…",
    exitConfirm: "Sair da criação do pedal? As informações preenchidas serão perdidas.",
  },
  edit: {
    title: "Editar pedal",
    submit: "Salvar alterações",
    submitting: "Salvando…",
    exitConfirm: "Descartar as alterações feitas no pedal?",
  },
} as const;

/** Valores iniciais do formulário (vazios na criação, do banco na edição). */
export interface PedalFormInitial {
  name: string;
  description: string;
  /** Formato `datetime-local`. */
  date: string;
  difficulty: PedalDifficulty | "";
  terrain: PedalTerrain | "";
  averageSpeedKmh: string;
  meetingPoint: string;
  route: RouteMapValue;
  /** Elevação já calculada para `route` (reaproveitada se o traçado não mudar). */
  elevationGain: number | null;
  maxParticipants: string;
  requiresSafetyEquipment: boolean;
  requiredEquipment: string[];
  ageGroup: PedalAgeGroup;
  visibility: PedalVisibility;
  coverUrl: string | null;
}

export const EMPTY_PEDAL_FORM: PedalFormInitial = {
  name: "",
  description: "",
  date: "",
  difficulty: "",
  terrain: "",
  averageSpeedKmh: "",
  meetingPoint: "",
  route: { geojson: null, coordinates: [], waypoints: [] },
  elevationGain: null,
  maxParticipants: "",
  requiresSafetyEquipment: false,
  requiredEquipment: [],
  ageGroup: "todas",
  visibility: "public",
  coverUrl: null,
};

export interface PedalFormSubmit {
  fields: Omit<PedalUpdateFields, "cover_image_url">;
  /** Nova capa escolhida (enviar ao storage). */
  coverFile: File | null;
  /** Usuário removeu a capa existente sem escolher outra. */
  removeCover: boolean;
}

interface PedalFormWizardProps {
  mode: "create" | "edit";
  initial: PedalFormInitial;
  /** Destino do botão "Sair". */
  exitHref: string;
  /** Persiste o pedal. Retorna `true` em caso de sucesso (o chamador navega). */
  onSubmit: (data: PedalFormSubmit) => Promise<boolean>;
  /** Conteúdo exibido abaixo da visibilidade quando "Privado" está selecionado. */
  privateNotice?: ReactNode;
}

/** Erro de validação com a etapa e o campo a focar. */
type ValidationIssue = { message: string; step: number; field: string };

function formatPedalDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const day = d.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${day.charAt(0).toUpperCase()}${day.slice(1)} às ${time}`;
}

function validateMaxParticipants(value: string): string | null {
  if (value.trim() === "") return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 2) {
    return "O máximo de participantes deve ser um número inteiro a partir de 2 (o organizador já conta como participante).";
  }
  if (n > MAX_PARTICIPANTS_LIMIT) {
    return `O máximo de participantes não pode passar de ${MAX_PARTICIPANTS_LIMIT}.`;
  }
  return null;
}

/** Identifica o traçado pelo conteúdo (não pela referência do array). */
function routeSignature(coordinates: [number, number][]): string {
  return coordinates.map(([lat, lng]) => `${lat.toFixed(6)},${lng.toFixed(6)}`).join(";");
}

/** Foca o campo (ou o primeiro controle dentro dele) e centraliza na tela. */
function focusField(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const target =
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement ||
    el instanceof HTMLButtonElement ||
    el.hasAttribute("tabindex")
      ? el
      : el.querySelector<HTMLElement>("input, textarea, select, button");
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  target?.focus({ preventScroll: true });
}

export function PedalFormWizard({
  mode,
  initial,
  exitHref,
  onSubmit,
  privateNotice,
}: PedalFormWizardProps) {
  const router = useRouter();
  const copy = MODE_COPY[mode];
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [elevationLoading, setElevationLoading] = useState(false);

  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [date, setDate] = useState(initial.date);
  const [difficulty, setDifficulty] = useState<PedalDifficulty | "">(initial.difficulty);
  const [terrain, setTerrain] = useState<PedalTerrain | "">(initial.terrain);
  const [averageSpeedKmh, setAverageSpeedKmh] = useState(initial.averageSpeedKmh);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [removeCover, setRemoveCover] = useState(false);

  const [meetingPoint, setMeetingPoint] = useState(initial.meetingPoint);
  const [routeValue, setRouteValue] = useState<RouteMapValue>(initial.route);
  const routeSig = useMemo(() => routeSignature(routeValue.coordinates), [routeValue.coordinates]);
  const distanceKm = useMemo(
    () =>
      routeValue.coordinates.length >= 2 ? calculateDistanceKm(routeValue.coordinates) : null,
    [routeValue.coordinates],
  );
  // Elevação vinculada ao traçado em que foi calculada: mudou o traçado, deixa de valer.
  const [elevation, setElevation] = useState(() => ({
    sig: routeSignature(initial.route.coordinates),
    gain: initial.elevationGain,
    failed: false,
  }));
  const elevationGain = elevation.sig === routeSig ? elevation.gain : null;
  const elevationFailed = elevation.sig === routeSig && elevation.failed;

  const [maxParticipants, setMaxParticipants] = useState(initial.maxParticipants);
  const [requiresSafetyEquipment, setRequiresSafetyEquipment] = useState(
    initial.requiresSafetyEquipment,
  );
  const [requiredEquipment, setRequiredEquipment] = useState<string[]>(initial.requiredEquipment);
  const [ageGroup, setAgeGroup] = useState<PedalAgeGroup>(initial.ageGroup);
  const [visibility, setVisibility] = useState<PedalVisibility>(initial.visibility);
  const [mapKey, setMapKey] = useState(0);
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(
    initial.route.coordinates[0] ?? null,
  );
  const prevStepRef = useRef(1);
  /** Evita cliques repetidos enquanto a etapa está avançando (cálculo de elevação, envio). */
  const busyRef = useRef(false);
  const pendingFocusRef = useRef<string | null>(null);
  const geoWarnedRef = useRef(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const formSig = JSON.stringify([
    name,
    description,
    date,
    difficulty,
    terrain,
    averageSpeedKmh,
    meetingPoint,
    routeSig,
    maxParticipants,
    requiresSafetyEquipment,
    requiredEquipment,
    ageGroup,
    visibility,
    coverFile?.name ?? null,
    removeCover,
  ]);
  const initialFormSigRef = useRef(formSig);
  const isDirty = formSig !== initialFormSigRef.current;

  useEffect(() => {
    const prev = prevStepRef.current;
    prevStepRef.current = step;
    if (step === 2 || step === 4) {
      if (prev !== step) setMapKey((k) => k + 1);
    }
    if (prev !== step) window.scrollTo({ top: 0 });
    const field = pendingFocusRef.current;
    if (field) {
      pendingFocusRef.current = null;
      requestAnimationFrame(() => focusField(field));
    }
  }, [step]);

  useEffect(() => {
    if (step === 2) {
      setMapCenter((prev) => getMapCenter() ?? prev);
      requestUserPosition()
        .then((center) => setMapCenter(center))
        .catch(() => {
          if (!geoWarnedRef.current) {
            geoWarnedRef.current = true;
            toast.warning(LOCATION_PERMISSION_MESSAGE, { id: "pedal-geolocation" });
          }
          setMapCenter((prev) => prev ?? MAP_INITIAL_VIEW_CENTER);
        });
    }
  }, [step]);

  useEffect(() => {
    if (coverFile) {
      const url = URL.createObjectURL(coverFile);
      setCoverPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setCoverPreviewUrl(null);
  }, [coverFile]);

  // Avisa antes de fechar/recarregar a aba com alterações não salvas.
  useEffect(() => {
    if (!isDirty || submitting) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty, submitting]);

  function getStepValidationIssue(s: number): ValidationIssue | null {
    if (s === 1) {
      if (!name.trim()) return { step: 1, field: "name", message: "Informe o nome do pedal." };
      if (!date) return { step: 1, field: "date", message: "Informe a data e hora do pedal." };
      const dateErr = validatePedalDatetimeLocal(date);
      if (dateErr) return { step: 1, field: "date", message: dateErr };
      if (!difficulty) return { step: 1, field: "difficulty", message: "Selecione a dificuldade." };
      if (!terrain) return { step: 1, field: "terrain", message: "Selecione o terreno." };
      const speedErr = validateAverageSpeedKmh(averageSpeedKmh);
      if (speedErr) return { step: 1, field: "averageSpeed", message: speedErr };
    }
    if (s === 2) {
      if (!routeValue.geojson || routeValue.coordinates.length < 2) {
        return {
          step: 2,
          field: "route-map",
          message: "Desenhe a rota no mapa (mínimo 2 pontos) para continuar.",
        };
      }
    }
    if (s === 3) {
      const maxErr = validateMaxParticipants(maxParticipants);
      if (maxErr) return { step: 3, field: "maxParticipants", message: maxErr };
    }
    return null;
  }

  function showIssue(issue: ValidationIssue) {
    toast.error(issue.message, { id: "pedal-validation" });
    if (issue.step !== step) {
      pendingFocusRef.current = issue.field;
      setStep(issue.step);
    } else {
      focusField(issue.field);
    }
  }

  /** Calcula a elevação do traçado atual; retorna `null` se a API falhar. */
  async function fetchElevation(): Promise<number | null> {
    if (routeValue.coordinates.length < 2) return null;
    const sig = routeSig;
    setElevationLoading(true);
    const { elevationGainM, error: err } = await getElevationGain(routeValue.coordinates);
    setElevationLoading(false);
    setElevation({ sig, gain: err ? null : elevationGainM, failed: Boolean(err) });
    return err ? null : elevationGainM;
  }

  async function handleNext() {
    if (busyRef.current) return;
    const issue = getStepValidationIssue(step);
    if (issue) {
      showIssue(issue);
      return;
    }
    busyRef.current = true;
    try {
      if (step === 2 && elevationGain === null) {
        await fetchElevation();
      }
      if (step < 4) {
        setStep(step + 1);
      } else {
        await handleSubmit();
      }
    } finally {
      busyRef.current = false;
    }
  }

  function handleBack() {
    if (busyRef.current) return;
    if (step > 1) setStep(step - 1);
  }

  function handleExit() {
    if (isDirty && !window.confirm(copy.exitConfirm)) return;
    router.push(exitHref);
  }

  function handleCoverChange(file: File | null) {
    if (coverInputRef.current) coverInputRef.current.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Escolha um arquivo de imagem (JPG, PNG ou WebP).");
      return;
    }
    if (file.size > COVER_MAX_BYTES) {
      toast.error("A imagem de capa deve ter no máximo 5 MB.");
      return;
    }
    setCoverFile(file);
    setRemoveCover(false);
  }

  function handleRemoveCover() {
    if (coverFile) setCoverFile(null);
    else setRemoveCover(true);
  }

  async function handleSubmit() {
    // Revalida tudo: a data pode ter "vencido" enquanto o formulário estava aberto.
    for (const s of [1, 2, 3]) {
      const issue = getStepValidationIssue(s);
      if (issue) {
        showIssue(issue);
        return;
      }
    }
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      toast.error("Você está offline. Conecte-se à internet para salvar o pedal.");
      return;
    }

    setSubmitting(true);

    const coords = routeValue.coordinates;
    const first = coords[0] ?? null;
    const last = coords[coords.length - 1] ?? null;
    const finalElevation = elevationGain ?? (await fetchElevation());

    const ok = await onSubmit({
      fields: {
        name: name.trim(),
        description: description.trim() || null,
        date: new Date(date).toISOString(),
        start_location: meetingPoint.trim() || null,
        start_lat: first ? first[0] : null,
        start_lng: first ? first[1] : null,
        end_location: null,
        end_lat: last ? last[0] : null,
        end_lng: last ? last[1] : null,
        distance_km: distanceKm,
        average_speed_kmh: parseAverageSpeedKmh(averageSpeedKmh),
        elevation_gain: finalElevation,
        difficulty: difficulty || null,
        terrain: terrain || null,
        max_participants: maxParticipants ? parseInt(maxParticipants, 10) : null,
        requires_safety_equipment: requiresSafetyEquipment,
        required_equipment: requiresSafetyEquipment ? requiredEquipment : [],
        age_group: ageGroup,
        visibility,
        route_geojson: routeValue.geojson,
        route_waypoints: serializeWaypointsForDb(routeValue.waypoints),
      },
      coverFile,
      removeCover,
    });

    // Em caso de sucesso o chamador navega; o botão fica travado até sair da tela.
    if (!ok) setSubmitting(false);
  }

  const busy = submitting || elevationLoading;
  const current = STEPS[step - 1];
  const coverDisplayUrl = coverPreviewUrl ?? (removeCover ? null : initial.coverUrl);
  const difficultyLabel = DIFFICULTY_OPTIONS.find((o) => o.value === difficulty)?.label ?? "—";
  const terrainLabel = TERRAIN_OPTIONS.find((o) => o.value === terrain)?.label ?? "—";
  const ageGroupLabel = AGE_GROUP_OPTIONS.find((o) => o.value === ageGroup)?.label ?? "—";
  const visibilityOption = VISIBILITY_OPTIONS.find((o) => o.value === visibility);
  const participantsCount = maxParticipants === "" ? null : Number(maxParticipants);

  return (
    <div className="mx-auto max-w-lg px-4 pb-4 pt-4">
      {/* Cabeçalho + progresso */}
      <header className="mb-6">
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={handleExit}
            className="-ml-2 inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-primary hover:bg-primary/5"
          >
            <ChevronLeftIcon className="h-4 w-4" />
            Sair
          </button>
          <span className="text-xs font-medium text-text-secondary">
            Etapa {step} de {STEPS.length}
          </span>
        </div>
        <h1 className="text-2xl font-semibold text-foreground">{copy.title}</h1>
        <p className="mt-0.5 text-sm text-text-secondary">
          <span className="font-medium text-foreground">{current.title}</span> · {current.subtitle}
        </p>
        <ol className="mt-4 grid grid-cols-4 gap-1.5" aria-label="Progresso">
          {STEPS.map((s, i) => {
            const n = i + 1;
            const done = n < step;
            const active = n === step;
            return (
              <li key={s.title}>
                <button
                  type="button"
                  onClick={() => done && !busy && setStep(n)}
                  disabled={!done || busy}
                  aria-current={active ? "step" : undefined}
                  aria-label={`Etapa ${n}: ${s.title}${done ? " (concluída)" : ""}`}
                  className="group block w-full py-1 disabled:cursor-default"
                >
                  <span
                    className={`block h-1.5 rounded-full transition-colors ${
                      done || active ? "bg-primary" : "bg-gray-200"
                    } ${done ? "group-hover:bg-primary/70" : ""}`}
                  />
                </button>
              </li>
            );
          })}
        </ol>
      </header>

      {step === 1 && (
        <div className="space-y-4">
          <Section title="Sobre o pedal">
            <div>
              <FieldLabel htmlFor="name" count={name.length} max={NAME_MAX}>
                Nome do pedal <Required />
              </FieldLabel>
              <input
                id="name"
                type="text"
                value={name}
                maxLength={NAME_MAX}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
                placeholder="Ex: Pedal da manhã no parque"
                autoComplete="off"
              />
            </div>
            <div>
              <FieldLabel htmlFor="description" count={description.length} max={DESCRIPTION_MAX}>
                Descrição
              </FieldLabel>
              <textarea
                id="description"
                value={description}
                maxLength={DESCRIPTION_MAX}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className={`${inputClass} resize-none`}
                placeholder="Ritmo, paradas previstas, o que levar…"
              />
            </div>
            <div>
              <span className={labelClass}>Imagem de capa</span>
              <input
                ref={coverInputRef}
                id="cover"
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => handleCoverChange(e.target.files?.[0] ?? null)}
              />
              {coverDisplayUrl ? (
                <div className="relative overflow-hidden rounded-xl border border-gray-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={coverDisplayUrl}
                    alt="Prévia da imagem de capa"
                    className="h-40 w-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 flex justify-end gap-2 bg-gradient-to-t from-black/60 to-transparent p-3">
                    <label
                      htmlFor="cover"
                      className="cursor-pointer rounded-lg bg-white/90 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-white"
                    >
                      Trocar
                    </label>
                    <button
                      type="button"
                      onClick={handleRemoveCover}
                      className="rounded-lg bg-white/90 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-white"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              ) : (
                <label
                  htmlFor="cover"
                  className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-gray-200 bg-background px-4 py-6 text-center transition-colors hover:border-primary/40 hover:bg-primary/5"
                >
                  <ImageIcon className="h-7 w-7 text-primary" />
                  <span className="text-sm font-medium text-foreground">Adicionar foto de capa</span>
                  <span className="text-xs text-text-secondary">JPG, PNG ou WebP · até 5 MB</span>
                </label>
              )}
            </div>
          </Section>

          <Section title="Quando">
            <div>
              <label htmlFor="date" className={labelClass}>
                Data e hora <Required />
              </label>
              <input
                id="date"
                type="datetime-local"
                value={date}
                min={getMinDatetimeLocalForPedal()}
                onChange={(e) => setDate(e.target.value)}
                className={inputClass}
              />
              {date && !validatePedalDatetimeLocal(date) && (
                <p className={`${hintClass} flex items-center gap-1`}>
                  <ClockIcon className="h-3.5 w-3.5" />
                  {formatPedalDate(date)}
                </p>
              )}
            </div>
          </Section>

          <Section title="Perfil do pedal">
            <ChipGroup
              id="difficulty"
              label="Dificuldade"
              required
              options={DIFFICULTY_OPTIONS}
              value={difficulty}
              onChange={setDifficulty}
              columns={3}
            />
            <ChipGroup
              id="terrain"
              label="Terreno"
              required
              options={TERRAIN_OPTIONS}
              value={terrain}
              onChange={setTerrain}
              columns={4}
            />
            <div>
              <label htmlFor="averageSpeed" className={labelClass}>
                Velocidade média <Required />
              </label>
              <div className="relative">
                <input
                  id="averageSpeed"
                  type="number"
                  inputMode="decimal"
                  min={1}
                  max={80}
                  step={0.1}
                  value={averageSpeedKmh}
                  onChange={(e) => setAverageSpeedKmh(e.target.value)}
                  className={`${inputClass} pr-16`}
                  placeholder="Ex: 20"
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-text-secondary">
                  km/h
                </span>
              </div>
              <p className={hintClass}>
                Ritmo previsto do grupo. Referência: iniciante 12–18 · intermediário 18–25 ·
                avançado 25+ km/h.
              </p>
            </div>
          </Section>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div id="route-map" tabIndex={-1} className="focus:outline-none">
            <RouteMap
              key={`route-step-2-${mapKey}`}
              value={routeValue}
              onChange={setRouteValue}
              center={mapCenter ?? undefined}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <StatTile
              icon={RouteIcon}
              label="Distância"
              value={distanceKm !== null ? `${distanceKm.toLocaleString("pt-BR")} km` : "—"}
            />
            <StatTile
              icon={MountainIcon}
              label="Elevação"
              value={
                elevationLoading
                  ? "Calculando…"
                  : elevationGain !== null
                    ? `${elevationGain.toLocaleString("pt-BR")} m`
                    : elevationFailed
                      ? "Indisponível"
                      : "Ao continuar"
              }
              muted={elevationGain === null}
            />
          </div>
          <Section title="Ponto de encontro">
            <div>
              <label htmlFor="meetingPoint" className="sr-only">
                Ponto de encontro
              </label>
              <textarea
                id="meetingPoint"
                value={meetingPoint}
                onChange={(e) => setMeetingPoint(e.target.value)}
                rows={2}
                className={`${inputClass} resize-none`}
                placeholder="Ex.: estacionamento do parque, portão norte…"
              />
              <p className={hintClass}>
                Opcional, mas ajuda os participantes a saber onde se juntar. No GPS, a referência é
                o primeiro ponto da rota.
              </p>
            </div>
          </Section>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <Section title="Participantes">
            <div>
              <label htmlFor="maxParticipants" className={labelClass}>
                Máximo de participantes
              </label>
              <div className="flex items-center gap-2">
                <StepperButton
                  label="Diminuir"
                  disabled={maxParticipants === ""}
                  onClick={() => {
                    const n = parseInt(maxParticipants, 10);
                    setMaxParticipants(!Number.isFinite(n) || n <= 2 ? "" : String(n - 1));
                  }}
                >
                  −
                </StepperButton>
                <input
                  id="maxParticipants"
                  type="number"
                  inputMode="numeric"
                  min={2}
                  max={MAX_PARTICIPANTS_LIMIT}
                  step={1}
                  value={maxParticipants}
                  onChange={(e) => setMaxParticipants(e.target.value)}
                  className={`${inputClass} text-center`}
                  placeholder="Sem limite"
                />
                <StepperButton
                  label="Aumentar"
                  onClick={() => {
                    const n = parseInt(maxParticipants, 10);
                    setMaxParticipants(
                      String(Number.isFinite(n) ? Math.min(n + 1, MAX_PARTICIPANTS_LIMIT) : 2),
                    );
                  }}
                >
                  +
                </StepperButton>
              </div>
              <p className={hintClass}>
                Deixe vazio para não limitar. O organizador já conta como participante.
              </p>
            </div>
            <ChipGroup
              id="ageGroup"
              label="Faixa etária"
              options={AGE_GROUP_OPTIONS}
              value={ageGroup}
              onChange={setAgeGroup}
              columns={3}
            />
          </Section>

          <Section title="Segurança">
            <label
              htmlFor="safety"
              className="flex cursor-pointer items-center justify-between gap-3"
            >
              <span className="flex items-start gap-3">
                <ShieldIcon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span>
                  <span className="block text-sm font-medium text-foreground">
                    Exige equipamento de segurança
                  </span>
                  <span className="block text-xs text-text-secondary">
                    Liste o que cada participante precisa levar.
                  </span>
                </span>
              </span>
              <span className="relative inline-block h-7 w-12 shrink-0">
                <input
                  id="safety"
                  type="checkbox"
                  role="switch"
                  className="peer sr-only"
                  checked={requiresSafetyEquipment}
                  onChange={(e) => setRequiresSafetyEquipment(e.target.checked)}
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
            {requiresSafetyEquipment && (
              <EquipmentInput value={requiredEquipment} onChange={setRequiredEquipment} />
            )}
          </Section>

          <Section title="Visibilidade">
            <div role="radiogroup" aria-label="Visibilidade" className="space-y-2">
              {VISIBILITY_OPTIONS.map((o) => {
                const selected = visibility === o.value;
                const Icon = o.icon;
                return (
                  <button
                    key={o.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setVisibility(o.value)}
                    className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                      selected
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-gray-200 bg-surface hover:bg-gray-50"
                    }`}
                  >
                    <Icon
                      className={`mt-0.5 h-5 w-5 shrink-0 ${selected ? "text-primary" : "text-text-secondary"}`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-foreground">{o.label}</span>
                      <span className="block text-xs text-text-secondary">{o.hint}</span>
                    </span>
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                        selected ? "border-primary bg-primary text-white" : "border-gray-300"
                      }`}
                      aria-hidden
                    >
                      {selected && <CheckIcon className="h-3 w-3" />}
                    </span>
                  </button>
                );
              })}
            </div>
            {visibility === "private" &&
              (privateNotice ?? (
                <p className="rounded-lg bg-primary/5 px-3 py-2 text-xs text-foreground">
                  Após publicar, você recebe um código de convite para compartilhar.
                </p>
              ))}
          </Section>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-surface shadow-sm">
            {coverDisplayUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverDisplayUrl} alt="" className="h-36 w-full object-cover" />
            ) : (
              <div className="h-20 bg-gradient-to-r from-[#1B5E20] to-[#43A047]" />
            )}
            <div className="p-4">
              <h2 className="text-lg font-semibold text-foreground">{name.trim()}</h2>
              <p className="mt-0.5 flex items-center gap-1 text-sm text-text-secondary">
                <ClockIcon className="h-4 w-4" />
                {formatPedalDate(date)}
              </p>
              {description.trim() && (
                <p className="mt-3 whitespace-pre-line text-sm text-foreground">
                  {description.trim()}
                </p>
              )}
              <div className="mt-4 grid grid-cols-3 gap-2">
                <StatTile
                  compact
                  icon={RouteIcon}
                  label="Distância"
                  value={distanceKm !== null ? `${distanceKm.toLocaleString("pt-BR")} km` : "—"}
                />
                <StatTile
                  compact
                  icon={MountainIcon}
                  label="Elevação"
                  value={elevationGain !== null ? `${elevationGain.toLocaleString("pt-BR")} m` : "—"}
                />
                <StatTile
                  compact
                  icon={GaugeIcon}
                  label="Vel. média"
                  value={averageSpeedKmh ? `${averageSpeedKmh} km/h` : "—"}
                />
              </div>
            </div>
          </div>

          <ReviewSection title="Detalhes" onEdit={() => setStep(1)}>
            <ReviewRow label="Dificuldade" value={difficultyLabel} />
            <ReviewRow label="Terreno" value={terrainLabel} />
          </ReviewSection>

          <ReviewSection title="Rota" onEdit={() => setStep(2)}>
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
            <ReviewRow
              label="Ponto de encontro"
              value={meetingPoint.trim() || "Primeiro ponto da rota"}
              icon={PinIcon}
            />
          </ReviewSection>

          <ReviewSection title="Regras e limites" onEdit={() => setStep(3)}>
            <ReviewRow
              label="Participantes"
              value={participantsCount ? `Até ${participantsCount}` : "Sem limite"}
            />
            <ReviewRow label="Faixa etária" value={ageGroupLabel} />
            <ReviewRow label="Visibilidade" value={visibilityOption?.label ?? "—"} />
            <ReviewRow
              label="Equipamento"
              value={
                requiresSafetyEquipment
                  ? requiredEquipment.length > 0
                    ? requiredEquipment.join(", ")
                    : "Obrigatório"
                  : "Não exigido"
              }
            />
          </ReviewSection>
        </div>
      )}

      {/* Barra de ações fixa acima do footer */}
      <div className="sticky bottom-[var(--footer-space)] z-[1001] -mx-4 mt-6 border-t border-gray-200 bg-background/95 px-4 py-3 backdrop-blur">
        <div className="flex gap-3">
          {step > 1 && (
            <button
              type="button"
              onClick={handleBack}
              disabled={busy}
              className="rounded-xl border border-gray-200 bg-surface px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              Voltar
            </button>
          )}
          <button
            type="button"
            onClick={handleNext}
            disabled={busy}
            aria-busy={busy}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1B5E20] to-[#43A047] px-6 py-3 text-sm font-semibold text-white shadow-md transition-opacity hover:opacity-95 disabled:opacity-60"
          >
            {busy && <Spinner />}
            {submitting
              ? copy.submitting
              : elevationLoading
                ? "Calculando rota…"
                : step === STEPS.length
                  ? copy.submit
                  : "Continuar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Required() {
  return (
    <span className="text-red-600" aria-hidden>
      *
    </span>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4 rounded-2xl border border-gray-200 bg-surface p-4 shadow-sm">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">{title}</h2>
      {children}
    </section>
  );
}

function FieldLabel({
  htmlFor,
  count,
  max,
  children,
}: {
  htmlFor: string;
  count: number;
  max: number;
  children: ReactNode;
}) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between gap-2">
      <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
        {children}
      </label>
      <span
        className={`text-xs tabular-nums ${count >= max ? "text-red-600" : "text-text-secondary"}`}
        aria-hidden
      >
        {count}/{max}
      </span>
    </div>
  );
}

function ChipGroup<T extends string>({
  id,
  label,
  required,
  options,
  value,
  onChange,
  columns,
}: {
  id: string;
  label: string;
  required?: boolean;
  options: { value: T; label: string }[];
  value: T | "";
  onChange: (v: T) => void;
  columns: 3 | 4;
}) {
  return (
    <div>
      <span id={`${id}-label`} className={labelClass}>
        {label} {required && <Required />}
      </span>
      <div
        id={id}
        role="radiogroup"
        aria-labelledby={`${id}-label`}
        className={`grid gap-2 ${columns === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"}`}
      >
        {options.map((o) => {
          const selected = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(o.value)}
              className={`rounded-xl border px-2 py-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                selected
                  ? "border-primary bg-primary text-white shadow-sm"
                  : "border-gray-200 bg-surface text-foreground hover:border-primary/40 hover:bg-primary/5"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  muted,
  compact,
}: {
  icon: (p: { className?: string }) => ReactNode;
  label: string;
  value: string;
  muted?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-gray-200 bg-surface ${compact ? "px-2.5 py-2" : "px-4 py-3"}`}
    >
      <span className="flex items-center gap-1.5 text-xs text-text-secondary">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
      <span
        className={`mt-0.5 block font-semibold ${compact ? "text-sm" : "text-base"} ${
          muted ? "text-text-secondary" : "text-foreground"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function ReviewSection({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-2xl border border-gray-200 bg-surface p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
          {title}
        </h2>
        <button
          type="button"
          onClick={onEdit}
          className="rounded-lg px-2 py-1 text-sm font-medium text-primary hover:bg-primary/5"
        >
          Editar
        </button>
      </div>
      {children}
    </section>
  );
}

function ReviewRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: (p: { className?: string }) => ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="flex shrink-0 items-center gap-1.5 text-text-secondary">
        {Icon && <Icon className="h-4 w-4" />}
        {label}
      </span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  );
}

function StepperButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-surface text-xl font-medium text-foreground transition-colors hover:bg-gray-50 disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function Spinner() {
  return (
    <span
      className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
      aria-hidden
    />
  );
}

function ImageIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" />
    </svg>
  );
}

/**
 * Estado do editor de rotas: pontos tocados pelo usuário (âncoras) e os trechos
 * entre eles. Cada trecho pode seguir as vias (ciclovias/ruas ou trilhas) ou
 * ser uma linha livre. Funções puras — o componente do mapa só renderiza.
 */

export type RouteDrawStyle = "cycling" | "mtb" | "free";

export interface RouteAnchor {
  id: string;
  lat: number;
  lng: number;
}

/**
 * - `pending`: aguardando o roteamento (desenhado em linha reta tracejada)
 * - `routed`: segue as vias
 * - `straight`: linha livre, por escolha do usuário
 * - `fallback`: o roteamento falhou e o trecho ficou em linha reta
 */
export type RouteSegmentStatus = "pending" | "routed" | "straight" | "fallback";

export interface RouteSegment {
  id: string;
  style: RouteDrawStyle;
  /** `[lat, lng]`, do ponto inicial ao final do trecho. */
  coords: [number, number][];
  status: RouteSegmentStatus;
}

export interface RouteEditorState {
  anchors: RouteAnchor[];
  /** `segments[i]` liga `anchors[i]` a `anchors[i + 1]`. */
  segments: RouteSegment[];
}

/** Rotas antigas com mais pontos que isso viram um único trecho fixo. */
const LEGACY_MAX_ANCHORS = 60;

export function newEditorId(prefix: string): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  );
}

function ll(a: RouteAnchor): [number, number] {
  return [a.lat, a.lng];
}

function samePoint(a: [number, number], b: [number, number]): boolean {
  return Math.abs(a[0] - b[0]) < 1e-7 && Math.abs(a[1] - b[1]) < 1e-7;
}

function buildSegment(
  from: RouteAnchor,
  to: RouteAnchor,
  style: RouteDrawStyle,
  interior: [number, number][] = []
): RouteSegment {
  return {
    id: newEditorId("seg"),
    style,
    coords: [ll(from), ...interior, ll(to)],
    status: style === "free" ? "straight" : "pending",
  };
}

/** Trechos recém-criados que ainda precisam passar pelo roteamento. */
function needsRouting(segments: RouteSegment[]): RouteSegment[] {
  return segments.filter((s) => s.status === "pending");
}

export function emptyEditor(): RouteEditorState {
  return { anchors: [], segments: [] };
}

/** Linha completa da rota (`[lat, lng]`) a partir dos trechos. */
export function editorCoordinates(ed: RouteEditorState): [number, number][] {
  if (ed.anchors.length === 0) return [];
  if (ed.anchors.length === 1) return [ll(ed.anchors[0])];
  const out: [number, number][] = [];
  for (const seg of ed.segments) {
    for (const c of seg.coords) {
      if (out.length > 0 && samePoint(out[out.length - 1], c)) continue;
      out.push(c);
    }
  }
  return out;
}

/**
 * Converte uma rota salva (só a linha) em estado do editor. Rotas desenhadas à
 * mão têm poucos pontos e viram âncoras editáveis; rotas longas (já roteadas)
 * mantêm a geometria num trecho único entre início e chegada.
 */
export function editorFromCoordinates(
  coords: [number, number][]
): RouteEditorState {
  if (coords.length === 0) return emptyEditor();
  const toAnchor = (c: [number, number], i: number): RouteAnchor => ({
    id: `legacy-${i}`,
    lat: c[0],
    lng: c[1],
  });
  if (coords.length <= LEGACY_MAX_ANCHORS) {
    const anchors = coords.map(toAnchor);
    const segments: RouteSegment[] = [];
    for (let i = 0; i < anchors.length - 1; i++) {
      segments.push({
        id: `legacy-seg-${i}`,
        style: "free",
        coords: [coords[i], coords[i + 1]],
        status: "straight",
      });
    }
    return { anchors, segments };
  }
  const last = coords.length - 1;
  return {
    anchors: [toAnchor(coords[0], 0), toAnchor(coords[last], last)],
    segments: [
      { id: "legacy-seg-0", style: "free", coords: [...coords], status: "straight" },
    ],
  };
}

export type EditorChange = {
  editor: RouteEditorState;
  /** Trechos que o chamador deve enviar ao roteamento. */
  toRoute: RouteSegment[];
};

export function appendAnchor(
  ed: RouteEditorState,
  lat: number,
  lng: number,
  style: RouteDrawStyle
): EditorChange {
  const anchor: RouteAnchor = { id: newEditorId("pt"), lat, lng };
  const prev = ed.anchors[ed.anchors.length - 1];
  if (!prev) {
    return { editor: { anchors: [anchor], segments: [] }, toRoute: [] };
  }
  const seg = buildSegment(prev, anchor, style);
  return {
    editor: {
      anchors: [...ed.anchors, anchor],
      segments: [...ed.segments, seg],
    },
    toRoute: needsRouting([seg]),
  };
}

export function removeLastAnchor(ed: RouteEditorState): RouteEditorState {
  if (ed.anchors.length === 0) return ed;
  return {
    anchors: ed.anchors.slice(0, -1),
    segments: ed.segments.slice(0, -1),
  };
}

/** Remove um ponto; os vizinhos passam a ser ligados por um novo trecho. */
export function removeAnchor(ed: RouteEditorState, id: string): EditorChange {
  const idx = ed.anchors.findIndex((a) => a.id === id);
  if (idx < 0) return { editor: ed, toRoute: [] };
  const last = ed.anchors.length - 1;
  if (idx === last) return { editor: removeLastAnchor(ed), toRoute: [] };
  if (idx === 0) {
    return {
      editor: { anchors: ed.anchors.slice(1), segments: ed.segments.slice(1) },
      toRoute: [],
    };
  }
  const style = ed.segments[idx - 1].style;
  const merged = buildSegment(ed.anchors[idx - 1], ed.anchors[idx + 1], style);
  return {
    editor: {
      anchors: ed.anchors.filter((a) => a.id !== id),
      segments: [
        ...ed.segments.slice(0, idx - 1),
        merged,
        ...ed.segments.slice(idx + 1),
      ],
    },
    toRoute: needsRouting([merged]),
  };
}

/** Move um ponto e recalcula os trechos que tocam nele. */
export function moveAnchor(
  ed: RouteEditorState,
  id: string,
  lat: number,
  lng: number
): EditorChange {
  const idx = ed.anchors.findIndex((a) => a.id === id);
  if (idx < 0) return { editor: ed, toRoute: [] };
  const anchors = ed.anchors.map((a) => (a.id === id ? { ...a, lat, lng } : a));
  const segments = [...ed.segments];
  const changed: RouteSegment[] = [];
  const rebuild = (segIdx: number) => {
    const old = segments[segIdx];
    // Linha livre mantém os pontos intermediários (ex.: rota antiga importada).
    const interior = old.style === "free" ? old.coords.slice(1, -1) : [];
    const seg = buildSegment(anchors[segIdx], anchors[segIdx + 1], old.style, interior);
    segments[segIdx] = seg;
    changed.push(seg);
  };
  if (idx > 0) rebuild(idx - 1);
  if (idx < anchors.length - 1) rebuild(idx);
  return { editor: { anchors, segments }, toRoute: needsRouting(changed) };
}

/**
 * Aplica o resultado do roteamento ao trecho `segmentId`, se ele ainda existir
 * (o usuário pode ter desfeito ou movido o ponto enquanto a resposta chegava).
 * Início e chegada da rota "grudam" na via; pontos do meio ficam onde foram
 * tocados, para não deslocar o trecho vizinho.
 */
export function applySegmentResult(
  ed: RouteEditorState,
  segmentId: string,
  routed: [number, number][] | null
): RouteEditorState | null {
  const idx = ed.segments.findIndex((s) => s.id === segmentId);
  if (idx < 0) return null;
  const seg = ed.segments[idx];
  if (!routed || routed.length < 2) {
    const segments = [...ed.segments];
    segments[idx] = { ...seg, status: "fallback" };
    return { ...ed, segments };
  }

  const anchors = [...ed.anchors];
  const lastAnchor = anchors.length - 1;
  const coords: [number, number][] = [...routed];

  const from = anchors[idx];
  if (idx === 0) {
    anchors[0] = { ...from, lat: coords[0][0], lng: coords[0][1] };
  } else if (!samePoint(ll(from), coords[0])) {
    coords.unshift(ll(from));
  }

  const to = anchors[idx + 1];
  if (idx + 1 === lastAnchor) {
    const end = coords[coords.length - 1];
    anchors[idx + 1] = { ...to, lat: end[0], lng: end[1] };
  } else if (!samePoint(ll(to), coords[coords.length - 1])) {
    coords.push(ll(to));
  }

  const segments = [...ed.segments];
  segments[idx] = { ...seg, coords, status: "routed" };
  return { anchors, segments };
}

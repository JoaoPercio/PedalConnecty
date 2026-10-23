import { describe, expect, it } from "vitest";
import {
  appendAnchor,
  applySegmentResult,
  editorCoordinates,
  editorFromCoordinates,
  emptyEditor,
  moveAnchor,
  removeAnchor,
  removeLastAnchor,
} from "../route-editor";

describe("route-editor", () => {
  it("primeiro toque cria só o início; o segundo cria um trecho para rotear", () => {
    const a = appendAnchor(emptyEditor(), -23.5, -46.6, "cycling");
    expect(a.editor.anchors).toHaveLength(1);
    expect(a.toRoute).toHaveLength(0);
    expect(editorCoordinates(a.editor)).toEqual([[-23.5, -46.6]]);

    const b = appendAnchor(a.editor, -23.51, -46.61, "cycling");
    expect(b.editor.segments).toHaveLength(1);
    expect(b.toRoute).toHaveLength(1);
    expect(b.toRoute[0].status).toBe("pending");
  });

  it("linha livre não precisa de roteamento", () => {
    const a = appendAnchor(emptyEditor(), 0, 0, "free").editor;
    const b = appendAnchor(a, 1, 1, "free");
    expect(b.toRoute).toHaveLength(0);
    expect(b.editor.segments[0].status).toBe("straight");
    expect(editorCoordinates(b.editor)).toEqual([[0, 0], [1, 1]]);
  });

  it("aplica o traçado roteado e gruda início/chegada na via", () => {
    const a = appendAnchor(emptyEditor(), 0, 0, "cycling").editor;
    const b = appendAnchor(a, 1, 1, "cycling");
    const routed: [number, number][] = [[0.001, 0], [0.5, 0.2], [1, 0.999]];
    const ed = applySegmentResult(b.editor, b.toRoute[0].id, routed)!;
    expect(ed.segments[0].status).toBe("routed");
    expect(ed.anchors[0]).toMatchObject({ lat: 0.001, lng: 0 });
    expect(ed.anchors[1]).toMatchObject({ lat: 1, lng: 0.999 });
    expect(editorCoordinates(ed)).toEqual(routed);
  });

  it("ignora resposta de trecho que já foi desfeito", () => {
    const a = appendAnchor(emptyEditor(), 0, 0, "cycling").editor;
    const b = appendAnchor(a, 1, 1, "cycling");
    const undone = removeLastAnchor(b.editor);
    expect(applySegmentResult(undone, b.toRoute[0].id, [[0, 0], [1, 1]])).toBeNull();
  });

  it("falha no roteamento deixa o trecho em linha reta (fallback)", () => {
    const a = appendAnchor(emptyEditor(), 0, 0, "mtb").editor;
    const b = appendAnchor(a, 1, 1, "mtb");
    const ed = applySegmentResult(b.editor, b.toRoute[0].id, null)!;
    expect(ed.segments[0].status).toBe("fallback");
    expect(editorCoordinates(ed)).toEqual([[0, 0], [1, 1]]);
  });

  it("remover ponto do meio liga os vizinhos com um novo trecho", () => {
    let ed = emptyEditor();
    ed = appendAnchor(ed, 0, 0, "free").editor;
    ed = appendAnchor(ed, 1, 1, "free").editor;
    ed = appendAnchor(ed, 2, 2, "free").editor;
    const mid = ed.anchors[1].id;
    const r = removeAnchor(ed, mid);
    expect(r.editor.anchors).toHaveLength(2);
    expect(r.editor.segments).toHaveLength(1);
    expect(editorCoordinates(r.editor)).toEqual([[0, 0], [2, 2]]);
  });

  it("mover um ponto recalcula os dois trechos vizinhos", () => {
    let ed = emptyEditor();
    ed = appendAnchor(ed, 0, 0, "cycling").editor;
    ed = appendAnchor(ed, 1, 1, "cycling").editor;
    ed = appendAnchor(ed, 2, 2, "cycling").editor;
    const r = moveAnchor(ed, ed.anchors[1].id, 1.5, 1.5);
    expect(r.toRoute).toHaveLength(2);
    expect(r.editor.anchors[1]).toMatchObject({ lat: 1.5, lng: 1.5 });
  });

  it("rota antiga longa vira um trecho fixo entre início e chegada", () => {
    const coords: [number, number][] = Array.from({ length: 200 }, (_, i) => [i / 1000, i / 1000]);
    const ed = editorFromCoordinates(coords);
    expect(ed.anchors).toHaveLength(2);
    expect(editorCoordinates(ed)).toEqual(coords);
    // Mover a chegada mantém a geometria intermediária.
    const moved = moveAnchor(ed, ed.anchors[1].id, 1, 1).editor;
    expect(editorCoordinates(moved)).toHaveLength(200);
  });
});

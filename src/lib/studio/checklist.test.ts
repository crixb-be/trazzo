import { describe, expect, it } from "vitest";
import {
  CHECKLIST_GROUPS,
  checklistProgress,
  parseChecklist,
  serializeChecklist,
} from "./checklist";

describe("checklist de expediente RNE", () => {
  it("recupera solo ítems vigentes y guarda cada marca una vez", () => {
    const checked = parseChecklist('["ubicacion","aforo","ubicacion","obsoleto",5]');
    expect(serializeChecklist(checked)).toBe('["ubicacion","aforo"]');
    expect(parseChecklist(serializeChecklist(checked))).toEqual(checked);
  });

  it("empieza vacío cuando faltan datos o el formato no es válido", () => {
    for (const raw of [null, "", "lista", "null", '{"ubicacion":true}']) {
      expect(parseChecklist(raw).size).toBe(0);
    }
  });

  it("calcula el progreso total y por especialidad, incluso al reiniciar", () => {
    const checked = parseChecklist('["ubicacion","aforo","salidas"]');
    const [architecture, safety, sanitary, structures] = CHECKLIST_GROUPS;
    expect(checklistProgress(checked)).toEqual({ completed: 3, total: 16 });
    expect(checklistProgress(checked, architecture.items)).toEqual({ completed: 1, total: 5 });
    expect(checklistProgress(checked, safety.items)).toEqual({ completed: 2, total: 4 });
    expect(checklistProgress(checked, sanitary.items)).toEqual({ completed: 0, total: 3 });
    expect(checklistProgress(checked, structures.items)).toEqual({ completed: 0, total: 4 });
    expect(checklistProgress(parseChecklist("[]"))).toEqual({ completed: 0, total: 16 });
  });
});

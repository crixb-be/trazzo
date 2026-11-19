import { describe, expect, it } from "vitest";
import { SIZE_STEPS, sizeSteps } from "./image-budget";

describe("tamaños para comprimir imágenes", () => {
  it("prueba de mayor a menor y nunca agranda una imagen pequeña", () => {
    expect(sizeSteps(2000)).toEqual([...SIZE_STEPS]);
    expect(sizeSteps(400)).toEqual([384, 320, 256, 192]);
    expect(sizeSteps(120)).toEqual([120]);
    expect(sizeSteps(0.4)).toEqual([1]);
  });
});

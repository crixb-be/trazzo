import { describe, expect, it } from "vitest";
import { appendTranscript, getSpeechRecognitionCtor } from "./dictation";

describe("dictado", () => {
  it("detecta ambas variantes de la API y tolera la ausencia de soporte", () => {
    class Standard {}
    class Prefixed {}
    expect(
      getSpeechRecognitionCtor({ SpeechRecognition: Standard, webkitSpeechRecognition: Prefixed }),
    ).toBe(Standard);
    expect(getSpeechRecognitionCtor({ webkitSpeechRecognition: Prefixed })).toBe(Prefixed);
    expect(getSpeechRecognitionCtor({})).toBeNull();
  });

  it("conserva el salto de línea y capitaliza el comienzo de una oración", () => {
    expect(appendTranscript("", "  ¿área libre? ")).toBe("¿Área libre?");
    expect(appendTranscript("Se verificó   ", " el nivel ")).toBe("Se verificó el nivel");
    expect(appendTranscript("Se verificó.  ", "falta revisar")).toBe("Se verificó. Falta revisar");
    expect(appendTranscript("Avance\n  ", "cimentación lista")).toBe("Avance\nCimentación lista");
    expect(appendTranscript("Texto  ", "  ")).toBe("Texto  ");
  });
});

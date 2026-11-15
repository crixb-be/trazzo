import { describe, expect, it } from "vitest";
import { parseInline, parseMarkdown } from "./markdown";

describe("chat markdown", () => {
  it("renders bold instead of raw asterisks", () => {
    expect(parseInline("El ancho es **0.90 m** libre.")).toEqual([
      { type: "text", text: "El ancho es " },
      { type: "strong", children: [{ type: "text", text: "0.90 m" }] },
      { type: "text", text: " libre." },
    ]);
  });

  it("parses bullet and numbered lists and keeps paragraphs apart", () => {
    const blocks = parseMarkdown(
      "Respuesta corta.\n\n**Respaldo técnico**\n- Ancho\n- Alto\n\n1. Uno\n2. Dos",
    );
    expect(blocks.map((block) => block.type)).toEqual(["paragraph", "paragraph", "list", "list"]);
    expect(blocks[2]).toMatchObject({ type: "list", ordered: false });
    expect(blocks[3]).toMatchObject({ type: "list", ordered: true });
  });

  it("keeps line breaks inside a paragraph", () => {
    const [block] = parseMarkdown("Línea uno\nLínea dos");
    expect(block).toMatchObject({ type: "paragraph" });
    expect(block.type === "paragraph" && block.lines.length).toBe(2);
  });

  it("turns citations into links, also inside bold text", () => {
    const [strong] = parseInline("**Mínimo [A.010 Cap. VI - Vanos]**");
    expect(strong).toMatchObject({ type: "strong" });
    expect(strong.type === "strong" && strong.children[1]).toMatchObject({
      type: "citation",
      href: "/normativa/vano-puerta-altura",
    });
  });

  it("hides an unclosed ** while the reply is still streaming", () => {
    expect(parseInline("El valor es **0.9")).toEqual([{ type: "text", text: "El valor es 0.9" }]);
  });

  it("does not treat multiplication as italic", () => {
    expect(parseInline("2 * 3 = 6")).toEqual([{ type: "text", text: "2 * 3 = 6" }]);
  });

  it("renders italic disclaimers and headings", () => {
    expect(parseInline("_Verifica el RNE._")[0]).toMatchObject({ type: "em" });
    expect(parseMarkdown("### Respaldo")[0]).toMatchObject({ type: "heading" });
  });
});

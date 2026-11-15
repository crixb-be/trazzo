import { parseCitations } from "@/lib/rag/citations";

/**
 * Minimal, safe Markdown for assistant answers: paragraphs with line breaks,
 * bullet and numbered lists, short headings, **bold**, *italic* / _italic_,
 * `code`, and RNE citations as links. Produces a tree that React renders
 * without dangerouslySetInnerHTML.
 */
export type InlineNode =
  | { type: "text"; text: string }
  | { type: "strong"; children: InlineNode[] }
  | { type: "em"; children: InlineNode[] }
  | { type: "code"; text: string }
  | { type: "citation"; label: string; href: string | null };

export type MarkdownBlock =
  | { type: "paragraph"; lines: InlineNode[][] }
  | { type: "list"; ordered: boolean; items: InlineNode[][] }
  | { type: "heading"; children: InlineNode[] };

const BULLET = /^\s*[-*•]\s+(.*)$/;
const ORDERED = /^\s*\d+[.)]\s+(.*)$/;
const HEADING = /^\s*#{1,6}\s+(.*)$/;
// Bold before italic; italic markers must hug the text ("*valor*", not "2 * 3").
const INLINE = /(\*\*[^*\n]+?\*\*|__[^_\n]+?__|`[^`\n]+`|\*[^\s*][^*\n]*?\*|_[^\s_][^_\n]*?_)/g;

function citationsAndText(text: string): InlineNode[] {
  return parseCitations(text)
    .filter((segment) => segment.text.length > 0)
    .map((segment) =>
      segment.citation
        ? { type: "citation", label: segment.citation, href: segment.href }
        : { type: "text", text: segment.text },
    );
}

/** While a reply streams, a lone "**" may not be closed yet; hide it instead of showing it raw. */
function dropUnclosedBold(text: string): string {
  const count = text.split("**").length - 1;
  if (count % 2 === 0) return text;
  const last = text.lastIndexOf("**");
  return text.slice(0, last) + text.slice(last + 2);
}

export function parseInline(raw: string): InlineNode[] {
  const text = dropUnclosedBold(raw);
  const nodes: InlineNode[] = [];
  let cursor = 0;

  for (const match of text.matchAll(INLINE)) {
    const start = match.index ?? 0;
    if (start > cursor) nodes.push(...citationsAndText(text.slice(cursor, start)));
    const token = match[0];
    if (token.startsWith("**") || token.startsWith("__")) {
      nodes.push({ type: "strong", children: citationsAndText(token.slice(2, -2)) });
    } else if (token.startsWith("`")) {
      nodes.push({ type: "code", text: token.slice(1, -1) });
    } else {
      nodes.push({ type: "em", children: citationsAndText(token.slice(1, -1)) });
    }
    cursor = start + token.length;
  }

  if (cursor < text.length) nodes.push(...citationsAndText(text.slice(cursor)));
  return nodes;
}

export function parseMarkdown(text: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  let paragraph: InlineNode[][] = [];
  let list: { ordered: boolean; items: InlineNode[][] } | null = null;

  const flushParagraph = () => {
    if (paragraph.length) blocks.push({ type: "paragraph", lines: paragraph });
    paragraph = [];
  };
  const flushList = () => {
    if (list) blocks.push({ type: "list", ...list });
    list = null;
  };

  for (const line of text.replace(/\r\n?/g, "\n").split("\n")) {
    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }

    const bullet = BULLET.exec(line);
    const ordered = ORDERED.exec(line);
    const heading = HEADING.exec(line);

    if (bullet || ordered) {
      flushParagraph();
      const isOrdered = Boolean(ordered) && !bullet;
      if (!list || list.ordered !== isOrdered) {
        flushList();
        list = { ordered: isOrdered, items: [] };
      }
      list.items.push(parseInline((bullet ?? ordered)?.[1] ?? ""));
    } else if (heading) {
      flushParagraph();
      flushList();
      blocks.push({ type: "heading", children: parseInline(heading[1]) });
    } else {
      flushList();
      paragraph.push(parseInline(line.trim()));
    }
  }

  flushParagraph();
  flushList();
  return blocks;
}

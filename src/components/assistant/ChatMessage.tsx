"use client";

import Link from "next/link";
import { BookOpen, ExternalLink, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import type { UIMessage } from "ai";
import { parseMarkdown, type InlineNode, type MarkdownBlock } from "@/lib/chat/markdown";
import { calculatorForCard } from "@/lib/rag/device";
import { parseCitations } from "@/lib/rag/citations";
import { BrandMark } from "@/components/brand/BrandMark";

function messageText(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("");
}

export function ChatMessage({ message }: { message: UIMessage }) {
  const text = messageText(message);
  const isUser = message.role === "user";

  return (
    <article className={"chat-message " + (isUser ? "user" : "assistant")}>
      <div className="chat-avatar">
        {isUser ? <UserRound size={15} /> : <BrandMark size={28} className="chat-avatar-mark" />}
      </div>
      <div className="chat-bubble">
        <div className="chat-content">{parseMarkdown(text).map(renderBlock)}</div>
        {!isUser && (
          <>
            <ChatSources text={text} />
            {[
              ...new Set(
                parseCitations(text)
                  .map((c) => (c.slug ? calculatorForCard(c.slug) : null))
                  .filter((v): v is string => !!v),
              ),
            ].map((tab) => (
              <Link className="btn" key={tab} href={"/calculadoras?tab=" + tab}>
                Abrir calculadora: {tab}
              </Link>
            ))}
          </>
        )}
      </div>
    </article>
  );
}

function renderInline(nodes: InlineNode[]): ReactNode[] {
  return nodes.map((node, index) => {
    switch (node.type) {
      case "text":
        return node.text;
      case "strong":
        return <strong key={index}>{renderInline(node.children)}</strong>;
      case "em":
        return <em key={index}>{renderInline(node.children)}</em>;
      case "code":
        return (
          <code className="chat-md-code" key={index}>
            {node.text}
          </code>
        );
      case "citation":
        return node.href ? (
          <Link className="citation-link mono" href={node.href} key={index}>
            {node.label}
            <ExternalLink size={11} aria-hidden="true" />
          </Link>
        ) : (
          <span className="citation-link mono" key={index}>
            {node.label}
          </span>
        );
    }
  });
}

function renderBlock(block: MarkdownBlock, index: number): ReactNode {
  if (block.type === "heading") {
    return (
      <p className="chat-md-heading" key={index}>
        {renderInline(block.children)}
      </p>
    );
  }
  if (block.type === "list") {
    const items = block.items.map((item, itemIndex) => (
      <li key={itemIndex}>{renderInline(item)}</li>
    ));
    return block.ordered ? (
      <ol className="chat-md-list" key={index}>
        {items}
      </ol>
    ) : (
      <ul className="chat-md-list" key={index}>
        {items}
      </ul>
    );
  }
  return (
    <p className="chat-md-paragraph" key={index}>
      {block.lines.map((line, lineIndex) => (
        <span key={lineIndex}>
          {lineIndex > 0 && <br />}
          {renderInline(line)}
        </span>
      ))}
    </p>
  );
}

function ChatSources({ text }: { text: string }) {
  const citations = parseCitations(text).filter((segment) => segment.href && segment.citation);
  const unique = [...new Map(citations.map((citation) => [citation.href, citation])).values()];
  if (unique.length === 0) return null;

  return (
    <div className="chat-sources">
      <span className="eyebrow">Fuentes</span>
      {unique.map((citation) => (
        <Link className="source-chip" href={citation.href ?? "/normativa"} key={citation.href}>
          <BookOpen size={12} /> {citation.citation}
        </Link>
      ))}
    </div>
  );
}

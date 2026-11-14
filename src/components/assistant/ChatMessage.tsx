"use client";

import Link from "next/link";
import { BookOpen, ExternalLink, UserRound } from "lucide-react";
import { parseCitations } from "@/lib/rag/citations";
import type { UIMessage } from "ai";

function messageText(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("");
}

export function ChatMessage({ message }: { message: UIMessage }) {
  const text = messageText(message);
  const segments = parseCitations(text);
  const isUser = message.role === "user";

  return (
    <article className={"chat-message " + (isUser ? "user" : "assistant")}>
      <div className="chat-avatar">{isUser ? <UserRound size={15} /> : <span>T</span>}</div>
      <div className="chat-bubble">
        <div className="chat-content">
          {segments.map((segment, index) =>
            segment.href ? (
              <Link className="citation-link mono" href={segment.href} key={index}>
                {segment.citation ?? segment.text}
                <ExternalLink size={11} aria-hidden="true" />
              </Link>
            ) : (
              <span key={index}>{renderLightMarkdown(segment.text)}</span>
            ),
          )}
        </div>
        {!isUser && <ChatSources text={text} />}
      </div>
    </article>
  );
}

function renderLightMarkdown(text: string): React.ReactNode {
  return text.split("\n").map((line, index) => (
    <span key={index}>
      {index > 0 && <br />}
      {line.startsWith("- ") ? "• " + line.slice(2) : line}
    </span>
  ));
}

function ChatSources({ text }: { text: string }) {
  const citations = parseCitations(text).filter((segment) => segment.href && segment.citation);
  const unique = [...new Map(citations.map((citation) => [citation.href, citation])).values()];
  if (unique.length === 0) return null;

  return (
    <div className="chat-sources">
      <span className="eyebrow">FUENTES</span>
      {unique.map((citation) => (
        <Link className="source-chip" href={citation.href ?? "/normativa"} key={citation.href}>
          <BookOpen size={12} /> {citation.citation}
        </Link>
      ))}
    </div>
  );
}

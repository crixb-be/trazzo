"use client";

import { Search } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RNE_CARDS } from "@/data/seed-rne";
import { ensureSeeded } from "@/lib/offline/db";
import { searchCards } from "@/lib/search/search";

export interface GlobalSearchProps {
  variant?: "header" | "inline";
  initialQuery?: string;
  onQueryChange?: (query: string) => void;
  /** Focus the input on mount (used by the mobile search sheet). */
  autoFocus?: boolean;
  /** Called after navigating to a result or pressing Escape. */
  onDismiss?: () => void;
}

export function GlobalSearch({
  variant = "header",
  initialQuery = "",
  onQueryChange,
  autoFocus = false,
  onDismiss,
}: GlobalSearchProps) {
  const [query, setQuery] = useState(initialQuery);
  const [open, setOpen] = useState(variant === "inline");
  const [activeIndex, setActiveIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const results = searchCards(RNE_CARDS, query).slice(0, 8);

  useEffect(() => {
    void ensureSeeded();

    function handleShortcut(event: KeyboardEvent): void {
      if (
        variant === "header" &&
        (event.key === "/" || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k"))
      ) {
        event.preventDefault();
        setOpen(true);
        window.setTimeout(() => inputRef.current?.focus(), 0);
      }
    }

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [variant]);

  function updateQuery(nextQuery: string): void {
    setQuery(nextQuery);
    setActiveIndex(0);
    setOpen(true);
    onQueryChange?.(nextQuery);
  }

  function selectResult(index: number): void {
    const card = results[index];
    if (!card) return;
    router.push("/normativa/" + card.slug);
    setOpen(false);
    onDismiss?.();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>): void {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, Math.max(0, results.length - 1)));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    }
    if (event.key === "Enter") {
      event.preventDefault();
      selectResult(activeIndex);
    }
    if (event.key === "Escape") {
      setOpen(false);
      onDismiss?.();
    }
  }

  return (
    <div className={"global-search " + (variant === "inline" ? "global-search-inline" : "")}>
      <div className="search-box">
        <Search size={variant === "inline" ? 20 : 17} aria-hidden="true" />
        <input
          ref={inputRef}
          autoFocus={autoFocus}
          placeholder={
            variant === "inline" ? "Busca una norma, cota o término de obra…" : "Buscar en el RNE…"
          }
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(event) => updateQuery(event.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Buscar normativa"
          aria-expanded={open}
          aria-controls={listId}
        />
        <kbd>{variant === "inline" ? "Enter" : "Ctrl K"}</kbd>
      </div>
      {open && query && (
        <div className="search-results" id={listId} role="listbox">
          {results.length > 0 ? (
            results.map((card, index) => (
              <button
                key={card.slug}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                className={index === activeIndex ? "active" : ""}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectResult(index)}
              >
                <span className="mono">{card.norm_code}</span>
                <span>{card.title}</span>
              </button>
            ))
          ) : (
            <p className="muted small">Sin resultados locales.</p>
          )}
        </div>
      )}
    </div>
  );
}

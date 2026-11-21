"use client";

import { Search } from "lucide-react";
import { handleSearchShortcut } from "@/lib/ui/search-shortcut";
import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RNE_CARDS } from "@/data/seed-rne";

import { searchCatalog } from "@/lib/search/catalog";
import { useCards, useProjects, useFeeQuotes } from "@/lib/offline/hooks";

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
  const cards = useCards(),
    projects = useProjects(),
    quotes = useFeeQuotes();
  const results = searchCatalog(query, cards.length ? cards : RNE_CARDS, projects ?? [], quotes);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent): void {
      if (variant !== "header" || !inputRef.current?.getClientRects().length) return;
      handleSearchShortcut(event, () => {
        setOpen(true);
        window.setTimeout(() => inputRef.current?.focus(), 0);
      });
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
    router.push(card.href);
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
          placeholder="Buscar en TRAZZO…"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(event) => updateQuery(event.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Buscar en TRAZZO"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
        />
        <kbd>{variant === "inline" ? "Enter" : "Ctrl K"}</kbd>
      </div>
      {/* The list stays in the page (hidden) so the combobox always has a target. */}
      {!(open && query) && <div id={listId} role="listbox" aria-label="Resultados" hidden />}
      {open && query && (
        <div className="search-results" id={listId} role="listbox" aria-label="Resultados">
          {results.length > 0 ? (
            results.map((card, index) => (
              <button
                key={card.id}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                className={index === activeIndex ? "active" : ""}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectResult(index)}
              >
                <span className="mono">{card.kind}</span>
                <span>{card.title}</span>
              </button>
            ))
          ) : (
            <p className="muted small" role="option" aria-selected="false" aria-disabled="true">
              {projects === undefined ? "Buscando en este espacio…" : "Sin resultados locales."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

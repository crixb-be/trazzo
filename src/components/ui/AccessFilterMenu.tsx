"use client";

import { Check, ChevronDown, ListFilter } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import {
  ACCESS_FILTER_OPTIONS,
  accessFilterLabel,
  type AccessFilter,
} from "@/lib/ui/access-filter";

export interface AccessFilterMenuProps {
  value: AccessFilter;
  onChange: (value: AccessFilter) => void;
}

/** Compact dropdown: Todas / Gratuitas / PRO / Favoritas. */
export function AccessFilterMenu({ value, onChange }: AccessFilterMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const selected = ACCESS_FILTER_OPTIONS.findIndex((option) => option.value === value);
    itemRefs.current[Math.max(0, selected)]?.focus({ preventScroll: true });

    function closeOnOutside(event: PointerEvent): void {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", closeOnOutside);
    return () => document.removeEventListener("pointerdown", closeOnOutside);
  }, [open, value]);

  function close(): void {
    setOpen(false);
    buttonRef.current?.focus({ preventScroll: true });
  }

  function choose(next: AccessFilter): void {
    onChange(next);
    close();
  }

  function onMenuKeyDown(event: React.KeyboardEvent<HTMLDivElement>): void {
    const items = itemRefs.current.filter((item): item is HTMLButtonElement => !!item);
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === "Escape" || event.key === "Tab") {
      if (event.key === "Escape") event.preventDefault();
      close();
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      items[(index + step + items.length) % items.length]?.focus();
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      items[event.key === "Home" ? 0 : items.length - 1]?.focus();
    }
  }

  const filtered = value !== "todas";

  return (
    <div className="access-filter" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className={"access-filter-button" + (filtered ? " is-filtered" : "")}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={"Filtrar por acceso: " + accessFilterLabel(value)}
        onClick={() => setOpen((visible) => !visible)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" && !open) {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <ListFilter size={16} aria-hidden="true" />
        <span>{accessFilterLabel(value)}</span>
        <ChevronDown size={14} aria-hidden="true" className={open ? "rotate" : undefined} />
      </button>
      {open && (
        <div
          className="access-filter-menu"
          id={menuId}
          role="menu"
          aria-label="Filtrar por acceso"
          onKeyDown={onMenuKeyDown}
        >
          {ACCESS_FILTER_OPTIONS.map((option, index) => {
            const checked = option.value === value;
            return (
              <button
                key={option.value}
                ref={(node) => {
                  itemRefs.current[index] = node;
                }}
                type="button"
                role="menuitemradio"
                aria-checked={checked}
                tabIndex={checked ? 0 : -1}
                onClick={() => choose(option.value)}
              >
                <span>{option.label}</span>
                {checked && <Check size={15} aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

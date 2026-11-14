"use client";

import type { ReactNode } from "react";

export interface TabItem {
  id: string;
  label: string;
}

export interface TabsProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  children?: ReactNode;
}

export function Tabs({ items, activeId, onChange, children }: TabsProps) {
  return (
    <div>
      <div className="tabs" role="tablist" aria-label="Secciones">
        {items.map((item) => (
          <button
            className={"tab " + (item.id === activeId ? "active" : "")}
            key={item.id}
            type="button"
            role="tab"
            aria-selected={item.id === activeId}
            onClick={() => onChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {children}
    </div>
  );
}

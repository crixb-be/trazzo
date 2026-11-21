"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

export function Modal({
  title,
  className,
  onClose,
  description,
  children,
}: {
  title: string;
  className?: string;
  onClose: () => void;
  description?: string;
  children: ReactNode;
}) {
  const id = useId();
  const dialog = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);

  useEffect(() => {
    close.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const trigger = document.activeElement;
    const panel = dialog.current;
    if (!panel) return;
    const focusable = () =>
      [
        ...panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]',
        ),
      ].filter((element) => element.getClientRects().length && element.tabIndex >= 0);

    (panel.querySelector<HTMLElement>("[data-initial-focus]") ?? focusable()[0] ?? panel).focus();

    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        close.current();
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      const index = items.indexOf(document.activeElement as HTMLElement);
      if (
        !items.length ||
        index < 0 ||
        (event.shiftKey ? index === 0 : index === items.length - 1)
      ) {
        event.preventDefault();
        (items[event.shiftKey ? items.length - 1 : 0] ?? panel)?.focus();
      }
    }

    document.addEventListener("keydown", keydown, true);
    return () => {
      document.removeEventListener("keydown", keydown, true);
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus();
    };
  }, []);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        ref={dialog}
        tabIndex={-1}
        className={["modal", className].filter(Boolean).join(" ")}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        aria-describedby={description ? id + "-description" : undefined}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 id={id}>{title}</h2>
        {description && <p id={id + "-description"}>{description}</p>}
        {children}
      </div>
    </div>
  );
}

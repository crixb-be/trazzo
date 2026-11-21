"use client";

import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { useSyncExternalStore } from "react";
import { Modal } from "./Modal";
import { subscribeWorkspace } from "@/lib/offline/workspace";

/**
 * App-wide feedback: floating notices (toast) and a confirmation dialog that
 * replaces window.confirm. Both are driven by plain functions so any handler
 * can call them without wiring state; <FeedbackHost /> renders them once in
 * the shell.
 */
export type ToastKind = "info" | "ok" | "error";

export interface ToastAction {
  label: string;
  run: () => void;
}

interface ToastItem {
  id: number;
  message: string;
  kind: ToastKind;
  action?: ToastAction;
}

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Styles the confirm button as destructive. */
  danger?: boolean;
}

type ConfirmAnswer = boolean | "alternate";

interface ConfirmRequest extends ConfirmOptions {
  alternateLabel?: string;
  resolve: (confirmed: ConfirmAnswer) => void;
}

interface FeedbackState {
  toasts: ToastItem[];
  confirm: ConfirmRequest | null;
}

const EMPTY: FeedbackState = { toasts: [], confirm: null };
let state: FeedbackState = EMPTY;
let nextId = 1;
const listeners = new Set<() => void>();

function setState(next: FeedbackState): void {
  state = next;
  for (const listener of listeners) listener();
}

subscribeWorkspace(() => {
  state.confirm?.resolve(false);
  if (state !== EMPTY) setState(EMPTY);
});

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function dismissToast(id: number): void {
  setState({ ...state, toasts: state.toasts.filter((item) => item.id !== id) });
}

/** Shows a floating notice. Notices with an action stay longer. */
export function toast(message: string, kind: ToastKind = "info", action?: ToastAction): void {
  if (!message) return;
  const id = nextId;
  nextId += 1;
  // The same text twice in a row replaces the earlier notice instead of stacking.
  const others = state.toasts.filter((item) => item.message !== message).slice(-2);
  setState({ ...state, toasts: [...others, { id, message, kind, action }] });
  if (typeof window !== "undefined") {
    window.setTimeout(() => dismissToast(id), action ? 15000 : 5000);
  }
}

/** Asks the user to confirm; resolves to true only when they accept. */
export function confirmDialog(
  options: ConfirmOptions & { alternateLabel: string },
): Promise<ConfirmAnswer>;
export function confirmDialog(options: ConfirmOptions): Promise<boolean>;
export function confirmDialog(
  options: ConfirmOptions & { alternateLabel?: string },
): Promise<ConfirmAnswer> {
  return new Promise((resolve) => {
    state.confirm?.resolve(false);
    setState({ ...state, confirm: { ...options, resolve } });
  });
}

function answer(confirmed: ConfirmAnswer): void {
  const request = state.confirm;
  if (!request) return;
  setState({ ...state, confirm: null });
  request.resolve(confirmed);
}

const ICONS = { info: Info, ok: CheckCircle2, error: AlertTriangle } as const;

export function FeedbackHost() {
  const current = useSyncExternalStore(
    subscribe,
    () => state,
    () => EMPTY,
  );
  const request = current.confirm;

  return (
    <>
      <div className="toast-region" role="status" aria-live="polite">
        {current.toasts.map((item) => {
          const Icon = ICONS[item.kind];
          return (
            <div className={"toast toast-" + item.kind} key={item.id}>
              <Icon size={18} aria-hidden="true" />
              <span>{item.message}</span>
              {item.action && (
                <button
                  type="button"
                  className="toast-action"
                  onClick={() => {
                    dismissToast(item.id);
                    item.action?.run();
                  }}
                >
                  {item.action.label}
                </button>
              )}
              <button
                type="button"
                className="toast-close"
                onClick={() => dismissToast(item.id)}
                aria-label="Cerrar aviso"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>

      {request && (
        <Modal
          className="confirm-modal"
          title={request.title}
          description={request.message}
          onClose={() => answer(false)}
        >
          <div className="confirm-actions">
            <button
              type="button"
              className="btn btn-secondary"
              data-initial-focus={request.danger ? true : undefined}
              onClick={() => answer(false)}
            >
              {request.cancelLabel ?? "Cancelar"}
            </button>
            {request.alternateLabel && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => answer("alternate")}
              >
                {request.alternateLabel}
              </button>
            )}
            <button
              data-initial-focus={!request.danger ? true : undefined}
              type="button"
              className={"btn " + (request.danger ? "btn-danger" : "btn-primary")}
              onClick={() => answer(true)}
            >
              {request.confirmLabel ?? "Aceptar"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

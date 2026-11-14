"use client";

import { Lock, X } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { PLANS } from "@/lib/plans/plans";

export interface PaywallModalProps {
  onClose: () => void;
  title?: string;
  children?: ReactNode;
}

export function PaywallModal({ onClose, title = "Contenido PRO", children }: PaywallModalProps) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="modal paywall-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="paywall-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="icon-btn close" type="button" onClick={onClose} aria-label="Cerrar">
          <X size={18} />
        </button>
        <Lock size={24} className="text-accent" aria-hidden="true" />
        <h2 id="paywall-title">{title}</h2>
        {children ?? (
          <p>
            Esta ficha está reservada para planes Estudiante y PRO. Activa tu plan para consultar
            criterios ampliados y sincronizar tu trabajo.
          </p>
        )}
        <div className="grid grid-2 paywall-plans">
          <div>
            <strong>{PLANS.student.label}</strong>
            <p className="small muted">S/ {PLANS.student.pricePen.toFixed(2)} / mes</p>
          </div>
          <div>
            <strong>{PLANS.pro.label}</strong>
            <p className="small muted">S/ {PLANS.pro.pricePen.toFixed(2)} / mes</p>
          </div>
        </div>
        <Link className="btn btn-primary" href="/cuenta" onClick={onClose}>
          Ver planes
        </Link>
      </div>
    </div>
  );
}

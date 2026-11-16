import type { ReactNode } from "react";

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  /** Decorative icon shown above the title. */
  icon?: ReactNode;
}

export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div className="empty-state card" role="status">
      {icon && (
        <span className="empty-state-icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <h2>{title}</h2>
      {description && <p className="muted">{description}</p>}
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
}

export interface LoadingStateProps {
  /** What is loading, for screen readers and as a visible caption. */
  label: string;
  /** Number of placeholder rows. */
  rows?: number;
}

/** Placeholder shown while a screen reads its data from the device. */
export function LoadingState({ label, rows = 3 }: LoadingStateProps) {
  return (
    <div className="loading-state" role="status" aria-live="polite">
      <div className="skeleton skeleton-title" />
      {Array.from({ length: rows }, (_, index) => (
        <div className="skeleton skeleton-row" key={index} />
      ))}
      <p className="muted small">{label}</p>
    </div>
  );
}

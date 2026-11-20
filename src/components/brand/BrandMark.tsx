import type { CSSProperties } from "react";

/** La T de TRAZZO usa una máscara transparente y el acento del tema activo. */
export function BrandMark({
  size = 34,
  className = "brand-mark",
}: {
  size?: number;
  className?: string;
}) {
  // A custom property, not width/height, so each frame's class can still resize it.
  const style = { "--mark-size": `${size}px` } as CSSProperties;
  return <span className={`trazo-mark ${className}`} aria-hidden="true" style={style} />;
}

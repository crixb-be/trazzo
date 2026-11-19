import type { CSSProperties } from "react";

/**
 * TRAZO's mark: the T from assets/logo.png on transparency, cut to
 * /brand/trazo-mark.png by `npm run icons`.
 *
 * The PNG is used as a CSS mask (see `.trazo-mark` in base.css) and painted with the
 * theme's brand gold, so it stays sharp and contrasted on any surface: the original
 * gold in Modo Oscuro, the darker gold of Modo Claro and the 7:1 gold of Modo Obra.
 * `className` replaces the default sizing class when the mark lives inside another
 * frame (the assistant badge, a chat avatar, the empty profile picture).
 */
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

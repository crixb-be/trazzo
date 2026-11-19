import Image from "next/image";

/**
 * TRAZO's mark, cut from assets/logo.png by `npm run icons`.
 * Served as-is (unoptimized) so it also renders offline from the service worker cache.
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
  return (
    <Image
      className={className}
      src="/brand/trazo-mark.png"
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      unoptimized
      priority
    />
  );
}

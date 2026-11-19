import Image from "next/image";

/**
 * TRAZO's mark, cut from assets/logo.png by `npm run icons`.
 * Served as-is (unoptimized) so it also renders offline from the service worker cache.
 */
export function BrandMark({ size = 34 }: { size?: number }) {
  return (
    <Image
      className="brand-mark"
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

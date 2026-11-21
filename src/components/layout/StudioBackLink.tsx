import Link from "next/link";

export function StudioBackLink() {
  return (
    <Link className="source-link studio-back-link" href="/estudio">
      <span aria-hidden="true">←</span> Estudio
    </Link>
  );
}

import Link from "next/link";

export default function OfflinePage() {
  return (
    <main className="auth-page offline-page">
      <div className="auth-grid-mark" aria-hidden="true" />
      <div className="card offline-card">
        <div className="brand">
          <span className="brand-mark">T</span>
          <span>
            <strong>TRAZO</strong>
            <small>La navaja suiza del arquitecto</small>
          </span>
        </div>
        <div className="eyebrow">SIN CONEXIÓN</div>
        <h1 className="page-title">La red quedó atrás.</h1>
        <p className="lead">
          Tus fichas, calculadoras y proyectos locales siguen disponibles en este dispositivo.
        </p>
        <Link className="btn btn-primary" href="/">
          Volver al espacio de trabajo
        </Link>
      </div>
    </main>
  );
}

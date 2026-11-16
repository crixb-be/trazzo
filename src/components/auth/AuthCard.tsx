"use client";

import Link from "next/link";
import { ArrowRight, KeyRound, Mail, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge, Button, Card, Input } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export function AuthCard({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const configured = Boolean(createClient());
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const isLogin = mode === "login";

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const client = createClient();
    if (!client) {
      setNotice(
        "Las cuentas aún no están activas en esta instalación. Puedes usar TRAZZO sin cuenta.",
      );
      return;
    }
    setBusy(true);
    const result = isLogin
      ? await client.auth.signInWithPassword({ email, password })
      : await client.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/auth/callback" },
        });
    setBusy(false);
    if (result.error) {
      setNotice(result.error.message);
      return;
    }
    if (isLogin) {
      router.push("/");
    } else {
      setNotice("Cuenta creada. Revisa tu correo para confirmar la dirección.");
    }
  }

  async function magicLink(): Promise<void> {
    const client = createClient();
    if (!client) {
      setNotice("El acceso por enlace aún no está activo en esta instalación.");
      return;
    }
    if (!email) {
      setNotice("Escribe tu correo para recibir el enlace.");
      return;
    }
    const result = await client.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + "/auth/callback" },
    });
    setNotice(result.error?.message ?? "Revisa tu correo: te enviamos un enlace de acceso.");
  }

  return (
    <Card className="auth-card">
      <Link className="auth-brand" href="/" aria-label="Volver a TRAZZO">
        <span className="brand-mark">T</span>
        <span>
          <strong>TRAZZO</strong>
          <small>RNE PRO · PERÚ</small>
        </span>
      </Link>
      <Badge variant={configured ? "ok" : "por-verificar"}>
        {configured ? "Cuenta conectada" : "Modo local"}
      </Badge>
      <div className="eyebrow">{isLogin ? "CUENTA / INGRESO" : "CUENTA / REGISTRO"}</div>
      <h1>{isLogin ? "Vuelve a tu criterio" : "Crea tu espacio técnico"}</h1>
      <p className="muted">
        {isLogin
          ? "Sincroniza proyectos y activa tu plan."
          : "Guarda tus proyectos y lleva tus fichas contigo."}
      </p>
      {!configured && (
        <div className="notice-banner">
          <Mail size={16} /> Las cuentas aún no están activas. Puedes usar TRAZZO sin cuenta.
        </div>
      )}
      <form className="auth-form" onSubmit={(event) => void submit(event)}>
        <div className="field">
          <label htmlFor="auth-email">Correo</label>
          <div className="input-with-icon">
            <Mail size={16} />
            <Input
              id="auth-email"
              type="email"
              required
              value={email}
              disabled={!configured}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="tu@correo.com"
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="auth-password">Contraseña</label>
          <div className="input-with-icon">
            <KeyRound size={16} />
            <Input
              id="auth-password"
              type="password"
              minLength={8}
              required
              value={password}
              disabled={!configured}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Mínimo 8 caracteres"
            />
          </div>
        </div>
        <Button type="submit" variant="primary" disabled={!configured || busy}>
          {busy ? "Procesando…" : isLogin ? "Ingresar" : "Crear cuenta"} <ArrowRight size={15} />
        </Button>
      </form>
      <div className="auth-divider">
        <span>o</span>
      </div>
      <Button variant="secondary" disabled={!configured} onClick={() => void magicLink()}>
        <Mail size={15} /> Enviarme un magic link
      </Button>
      {notice && <p className="warning">{notice}</p>}
      <p className="auth-switch">
        {isLogin ? "¿Aún no tienes cuenta?" : "¿Ya tienes una cuenta?"}{" "}
        <Link href={isLogin ? "/register" : "/login"}>{isLogin ? "Registrarme" : "Ingresar"}</Link>
      </p>
      <Link className="muted small" href="/">
        ← Continuar en modo local
      </Link>
    </Card>
  );
}

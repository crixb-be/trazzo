"use client";

import Link from "next/link";
import { ArrowRight, KeyRound, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { BrandMark } from "@/components/brand/BrandMark";
import { Badge, Button, Card, Input } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export function AuthCard({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const configured = Boolean(createClient());
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState<"password" | "link" | null>(null);
  const running = useRef(false);
  const emailField = useRef<HTMLInputElement>(null);
  const isLogin = mode === "login";

  async function authenticate(action: "password" | "link") {
    if (running.current) return;
    const client = createClient();
    if (!client) {
      setNotice("Las cuentas aún no están activas. Puedes usar TRAZZO sin cuenta.");
      return;
    }
    if (!emailField.current?.validity.valid) {
      setNotice("Ingresa un correo válido para recibir el enlace.");
      emailField.current?.focus();
      return;
    }
    running.current = true;
    setPending(action);
    setNotice("");
    const address = email.trim();
    const redirect = window.location.origin + "/auth/callback";
    const failure =
      action === "link"
        ? "No se pudo enviar el enlace. Inténtalo de nuevo."
        : isLogin
          ? "No se pudo ingresar. Revisa tu correo y contraseña."
          : "No se pudo crear la cuenta. Revisa tus datos e inténtalo de nuevo.";
    try {
      const result =
        action === "link"
          ? await client.auth.signInWithOtp({
              email: address,
              options: { emailRedirectTo: redirect },
            })
          : isLogin
            ? await client.auth.signInWithPassword({ email: address, password })
            : await client.auth.signUp({
                email: address,
                password,
                options: { emailRedirectTo: redirect },
              });
      if (result.error) setNotice(failure);
      else if (action === "link") setNotice("Revisa tu correo. Te enviamos un enlace de acceso.");
      else if (isLogin) router.push("/");
      else setNotice("Cuenta creada. Revisa tu correo para confirmar la dirección.");
    } catch {
      setNotice(failure);
    } finally {
      running.current = false;
      setPending(null);
    }
  }

  return (
    <Card className="auth-card">
      <Link className="auth-brand" href="/" title="Volver al inicio">
        <BrandMark />
        <span className="auth-brand-text">
          <strong>TRAZZO</strong>
          <small>Del estudio a la obra</small>
        </span>
      </Link>
      <header className="auth-heading">
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
      </header>
      {!configured && (
        <div className="notice-banner">
          <Mail size={16} /> Las cuentas aún no están activas. Puedes usar TRAZZO sin cuenta.
        </div>
      )}
      <form
        className="auth-form"
        onSubmit={(event) => {
          event.preventDefault();
          void authenticate("password");
        }}
      >
        <div className="field">
          <label htmlFor="auth-email">Correo</label>
          <div className="input-with-icon">
            <Mail size={16} />
            <Input
              id="auth-email"
              ref={emailField}
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
        <Button type="submit" variant="primary" disabled={!configured || !!pending}>
          {pending === "password" ? "Procesando…" : isLogin ? "Ingresar" : "Crear cuenta"}{" "}
          <ArrowRight size={15} />
        </Button>
      </form>
      <div className="auth-divider">
        <span>o</span>
      </div>
      <Button
        className="auth-magic"
        variant="secondary"
        disabled={!configured || !!pending}
        onClick={() => void authenticate("link")}
      >
        <Mail size={15} />{" "}
        {pending === "link" ? "Enviando enlace…" : "Enviarme un enlace de acceso"}
      </Button>
      <p className="auth-notice" role="status">
        {notice}
      </p>
      <footer className="auth-links">
        <p className="auth-switch">
          {isLogin ? "¿Aún no tienes cuenta?" : "¿Ya tienes una cuenta?"}{" "}
          <Link href={isLogin ? "/register" : "/login"}>
            {isLogin ? "Registrarme" : "Ingresar"}
          </Link>
        </p>
        <Link className="muted small" href="/">
          ← Continuar en modo local
        </Link>
      </footer>
    </Card>
  );
}

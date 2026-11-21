"use client";

import { ArrowRight, Cloud, HardDrive, KeyRound, LogOut, Mail, RefreshCw } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { useWorkspace } from "@/components/layout/WorkspaceProvider";
import { deleteLocalCopy } from "@/lib/offline/delete-local-copy";
import { getActiveDatabase, GUEST_WORKSPACE } from "@/lib/offline/workspace";
import { describeGuestData, prepareGuestWorkspace } from "@/lib/offline/workspace-migration";
import { useCurrentPlan } from "@/lib/plans/use-current-plan";
import { Badge, Button, Card, confirmDialog, Input, toast } from "@/components/ui";
import { useSyncStatus } from "@/lib/offline/hooks";
import { describeSyncResult, describeSyncStatus, syncNow } from "@/lib/offline/sync";
import { createClient } from "@/lib/supabase/client";

export interface AccountAccessProps {
  /** Called with the signed-in email, or null when there is no session. */
  onSessionChange?: (email: string | null) => void;
}

function callbackUrl(): string {
  return window.location.origin + "/auth/callback";
}

export function AccountAccess({ onSessionChange }: AccountAccessProps) {
  const sync = useSyncStatus();
  const [configured] = useState(() => Boolean(createClient()));
  const { id, user, guestData, openGuestTransfer } = useWorkspace();
  const plan = useCurrentPlan();
  const signedIn = id !== GUEST_WORKSPACE;
  const sessionEmail = signedIn ? (user?.email ?? plan.email) : null;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [manualSync, setManualSync] = useState(false);
  const reconciling = sync.syncing || manualSync;
  useEffect(() => {
    onSessionChange?.(sessionEmail);
  }, [onSessionChange, sessionEmail]);

  async function signIn(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const client = createClient();
    if (!client) return;
    setBusy(true);
    const { error } = await client.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      toast(error.message, "error");
      return;
    }
    setPassword("");
    toast("Sesión iniciada. Conciliando tus datos con la cuenta…");
  }

  async function signUp(): Promise<void> {
    const client = createClient();
    if (!client) return;
    if (!email || password.length < 8) {
      toast("Escribe tu correo y una contraseña de al menos 8 caracteres.", "error");
      return;
    }
    setBusy(true);
    const { error } = await client.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: callbackUrl() },
    });
    setBusy(false);
    toast(
      error ? error.message : "Cuenta creada. Revisa tu correo para confirmar la dirección.",
      error ? "error" : "ok",
    );
  }

  async function magicLink(): Promise<void> {
    const client = createClient();
    if (!client) return;
    if (!email) {
      toast("Escribe tu correo para recibir el enlace.", "error");
      return;
    }
    setBusy(true);
    const { error } = await client.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callbackUrl() },
    });
    setBusy(false);
    toast(
      error ? error.message : "Revisa tu correo: te enviamos un enlace de acceso.",
      error ? "error" : "ok",
    );
  }

  // Signing in already triggers the two-way pass (startOnlineSync); this repeats it on demand.
  async function syncAccount(): Promise<void> {
    setManualSync(true);
    try {
      toast(describeSyncResult(await syncNow()));
    } finally {
      setManualSync(false);
    }
  }

  async function endSession(): Promise<void> {
    const client = createClient();
    if (!client) throw new Error("No se pudo cerrar la sesión.");
    const { error } = await client.auth.signOut({ scope: "local" });
    if (error && !isAuthRetryableFetchError(error)) throw error;
  }

  async function signOut(erase = false): Promise<void> {
    const local = getActiveDatabase();
    setBusy(true);
    try {
      if (erase) {
        const deleted = await deleteLocalCopy(id, {
          confirm: (pending) => {
            const options = {
              title: "¿Cerrar sesión y borrar la copia local?",
              message:
                (pending ? `Hay ${pending} cambios sin sincronizar. ` : "") +
                "Se borrarán los datos de esta cuenta guardados en este dispositivo, incluidos los que solo existen aquí.",
              confirmLabel: "Cerrar sesión y borrar",
              danger: true,
            };
            return pending && navigator.onLine
              ? confirmDialog({ ...options, alternateLabel: "Sincronizar ahora" })
              : confirmDialog(options);
          },
          sync: syncAccount,
          signOut: endSession,
        });
        if (deleted) toast("Sesión cerrada y copia local borrada.", "ok");
      } else {
        await prepareGuestWorkspace();
        if (getActiveDatabase() !== local) return;
        await endSession();
        toast("Sesión cerrada. Tus datos siguen en este dispositivo.");
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : "No se pudo completar la acción.", "error");
    } finally {
      setBusy(false);
    }
  }

  const lastSync = sync.lastSync ? new Date(sync.lastSync).toLocaleString("es-PE") : "Nunca";
  const backupBadge = sync.accountMismatch ? (
    <Badge variant="danger">Revisa tu sesión</Badge>
  ) : reconciling ? (
    <Badge variant="warn">Conciliando…</Badge>
  ) : sync.pending > 0 ? (
    <Badge variant="warn">Cambios pendientes</Badge>
  ) : sync.lastSync ? (
    <Badge variant="ok">Respaldado</Badge>
  ) : (
    <Badge variant="por-verificar">Sin respaldo aún</Badge>
  );

  return (
    <>
      <p className="muted small">
        Espacio activo: {signedIn ? sessionEmail || "cuenta" : "sin cuenta"}
      </p>
      <div className="account-grid account-access">
        {!signedIn && (
          <Card className="guest-card">
            <div className="eyebrow">Modo invitado / Local</div>
            <h2>
              <HardDrive size={18} aria-hidden="true" /> Trabajas en este dispositivo
            </h2>
            <p className="muted small">
              Proyectos, metrados, cotizaciones y tu perfil se guardan aquí y funcionan sin
              conexión. No necesitas una cuenta para usar TRAZZO.
            </p>
            <div className="sync-details">
              <span>
                Guardado <strong>Solo en este dispositivo</strong>
              </span>
              <span>
                Cambios sin respaldar <strong className="mono">{sync.pending}</strong>
              </span>
            </div>
            {!configured && (
              <p className="muted small">
                Las cuentas y el respaldo en la nube aún no están activos en esta instalación.
              </p>
            )}
          </Card>
        )}

        {configured && !signedIn && (
          <Card className="sign-in-card">
            <div className="eyebrow">Cuenta</div>
            <h2>Iniciar sesión o crear cuenta</h2>
            <p className="muted small">
              Tu cuenta tiene su propio espacio. Puedes conservar los datos guardados sin cuenta o
              pasarlos a tu cuenta.
            </p>
            <form className="auth-form" onSubmit={(event) => void signIn(event)}>
              <div className="field">
                <label htmlFor="account-email">Correo</label>
                <div className="input-with-icon">
                  <Mail size={16} />
                  <Input
                    id="account-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="tu@correo.com"
                  />
                </div>
              </div>
              <div className="field">
                <label htmlFor="account-password">Contraseña</label>
                <div className="input-with-icon">
                  <KeyRound size={16} />
                  <Input
                    id="account-password"
                    type="password"
                    autoComplete="current-password"
                    minLength={8}
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Mínimo 8 caracteres"
                  />
                </div>
              </div>
              <div className="hero-actions">
                <Button type="submit" variant="primary" disabled={busy}>
                  {busy ? "Procesando…" : "Ingresar"} <ArrowRight size={15} />
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => void signUp()}
                >
                  Crear cuenta
                </Button>
              </div>
            </form>
            <div className="auth-divider">
              <span>o</span>
            </div>
            <Button variant="secondary" disabled={busy} onClick={() => void magicLink()}>
              <Mail size={15} /> Enviarme un Magic Link
            </Button>
          </Card>
        )}

        {signedIn && (
          <Card className="backup-status-card">
            <div className="eyebrow">Cuenta / Respaldo</div>
            <h2>
              <Cloud size={18} aria-hidden="true" /> {sessionEmail || "Sesión iniciada"}
            </h2>
            {backupBadge}
            <div className="sync-details">
              <span>
                Conexión <strong>{sync.online ? "En línea" : "Sin conexión"}</strong>
              </span>
              <span>
                Cambios pendientes <strong className="mono">{sync.pending}</strong>
              </span>
              <span>
                Último respaldo <strong>{lastSync}</strong>
              </span>
            </div>
            <p className="muted small" role="status">
              {describeSyncStatus(sync)}
            </p>
            {sync.accountMismatch && (
              <p className="warning small">
                La cuenta no coincide con el espacio activo. Vuelve a ingresar para sincronizar.
              </p>
            )}
            {sync.error && <p className="warning small">Último error: {sync.error}</p>}
            <div className="hero-actions">
              <Button
                onClick={() => void syncAccount()}
                disabled={!sync.online || reconciling || busy}
              >
                <RefreshCw size={15} /> {reconciling ? "Conciliando…" : "Sincronizar ahora"}
              </Button>
              <Button variant="ghost" disabled={busy} onClick={() => void signOut()}>
                <LogOut size={15} /> Cerrar sesión
              </Button>
            </div>
            <p className="legal">
              Al cerrar sesión conservas la copia de tu cuenta y sigues en el espacio sin cuenta.
            </p>
            <button
              type="button"
              className="btn btn-danger"
              disabled={busy || reconciling}
              onClick={() => void signOut(true)}
            >
              Cerrar sesión y borrar los datos de esta cuenta en este dispositivo
            </button>
          </Card>
        )}
        {signedIn && guestData?.hasData && (
          <Card>
            <h2>Datos sin cuenta en este dispositivo</h2>
            <p className="muted small">{describeGuestData(guestData)}</p>
            <Button variant="secondary" onClick={openGuestTransfer}>
              Pasar a esta cuenta
            </Button>
          </Card>
        )}
      </div>
    </>
  );
}

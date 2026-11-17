"use client";

import {
  Camera,
  Check,
  Cloud,
  FileUp,
  FolderOpen,
  Images,
  RefreshCw,
  RotateCcw,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import {
  Badge,
  BillingToggle,
  Button,
  Card,
  confirmDialog,
  DisplaySettings,
  Input,
  toast,
} from "@/components/ui";
import { BackupCard } from "./BackupCard";
import { FavoriteToolsEditor } from "@/components/onboarding/FavoriteToolsEditor";
import { InstallGuide } from "@/components/onboarding/InstallGuide";
import { SEED_VERSION } from "@/data/seed-rne";
import { db } from "@/lib/offline/db";
import { getStudioProfile, saveStudioProfile } from "@/lib/offline/profile";
import { useStudioProfile, useSyncStatus } from "@/lib/offline/hooks";
import { describeSyncResult, syncNow as runSync } from "@/lib/offline/sync";
import {
  formatPlanPrice,
  isEduPeEmail,
  monthlyEquivalent,
  PLANS,
  type BillingCycle,
  type Plan,
} from "@/lib/plans/plans";
import { invalidatePlanSnapshot } from "@/lib/plans/plan-store";
import { useCurrentPlan } from "@/lib/plans/use-current-plan";
import { detectNativePlatform } from "@/lib/native/platform";
import { billingViewState } from "@/lib/payments/billing-view";
import {
  DEMO_PAYMENT_MESSAGE,
  type PaymentProvider,
  type PaymentProviderAvailability,
} from "@/lib/payments/providers";
import { createClient } from "@/lib/supabase/client";
import { prepareAvatar } from "@/lib/ui/avatar";
import { prepareLogo } from "@/lib/ui/logo";
import { isValidRuc } from "@/lib/validation";

const features: Record<Plan, string[]> = {
  free: [
    "Todas las calculadoras",
    "Fichas básicas",
    "1 proyecto",
    "10 consultas al asistente por día",
    "PDF con marca de agua",
  ],
  student: [
    "Fichas Pro",
    "Proyectos ilimitados",
    "50 consultas al asistente por día",
    "PDF limpio",
  ],
  pro: [
    "Fichas verificadas avanzadas",
    "Proyectos ilimitados",
    "Consultas IA ilimitadas",
    "Exportación completa",
  ],
};

function initials(source: string): string {
  const words = source
    .replace(/@.*$/, "")
    .split(/[\s._-]+/)
    .filter(Boolean);
  const letters = words.slice(0, 2).map((word) => word[0]?.toUpperCase() ?? "");
  return letters.join("") || "T";
}

export function AccountWorkspace() {
  const sync = useSyncStatus();
  const studio = useStudioProfile();
  const [configured, setConfigured] = useState(Boolean(createClient()));
  const [email, setEmail] = useState("");
  const { plan: currentPlan, studentVerified } = useCurrentPlan();
  const [name, setName] = useState("");
  const [capNumber, setCapNumber] = useState("");
  const [studioName, setStudioName] = useState("");
  const [ruc, setRuc] = useState("");
  const [address, setAddress] = useState("");
  const [brandPrimary, setBrandPrimary] = useState("#13294B");
  const [brandSecondary, setBrandSecondary] = useState("#C59B27");
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const filesInputRef = useRef<HTMLInputElement>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [nativePlatform, setNativePlatform] = useState<boolean | null>(null);
  const [paymentProviders, setPaymentProviders] = useState<PaymentProviderAvailability>({
    mercadopago: false,
    culqi: false,
  });
  const [document, setDocument] = useState<File | null>(null);
  // Notices float above the page: this screen is long and a message at the end went unseen.
  const setNotice = (message: string): void => toast(message);

  useEffect(() => {
    void getStudioProfile().then((profile) => {
      setName(profile.fullName);
      setCapNumber(profile.capNumber);
      setStudioName(profile.studioName);
      setRuc(profile.ruc);
      setAddress(profile.address);
      setBrandPrimary(profile.brandPrimary);
      setBrandSecondary(profile.brandSecondary);
      setLogoDataUrl(profile.logoDataUrl);
      setAvatarDataUrl(profile.avatarDataUrl);
    });
  }, []);

  useEffect(() => {
    setNativePlatform(detectNativePlatform());
    void fetch("/api/payments/config")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { providers?: PaymentProviderAvailability } | null) => {
        if (data?.providers) setPaymentProviders(data.providers);
      })
      .catch(() => {
        // Missing backend configuration is an expected demo state.
      });
  }, []);

  useEffect(() => {
    if (studio.updatedAt) {
      setName(studio.fullName);
      setCapNumber(studio.capNumber);
      setStudioName(studio.studioName);
      setRuc(studio.ruc);
      setAddress(studio.address);
      setBrandPrimary(studio.brandPrimary);
      setBrandSecondary(studio.brandSecondary);
      setLogoDataUrl(studio.logoDataUrl);
      setAvatarDataUrl(studio.avatarDataUrl);
    }
  }, [studio.updatedAt]);

  useEffect(() => {
    const client = createClient();
    setConfigured(Boolean(client));
    if (client) {
      void client.auth.getUser().then(async ({ data }) => {
        if (!data.user) return;
        setEmail(data.user.email ?? "");
        const profile = await client
          .from("profiles")
          .select("full_name,cap_number")
          .eq("id", data.user.id)
          .maybeSingle();
        if (typeof profile.data?.full_name === "string") setName(profile.data.full_name);
        if (typeof profile.data?.cap_number === "string") setCapNumber(profile.data.cap_number);
      });
    }
  }, []);

  async function saveProfile(): Promise<void> {
    await saveStudioProfile({
      fullName: name,
      capNumber,
      studioName,
      ruc,
      address,
      brandPrimary,
      brandSecondary,
      logoDataUrl,
    });
    let remoteFailed = false;
    try {
      const client = createClient();
      if (client) {
        const { data } = await client.auth.getUser();
        if (data.user) {
          let logoUrl: string | null = null;
          if (logoDataUrl) {
            const response = await fetch(logoDataUrl);
            const blob = await response.blob();
            const upload = await client.storage
              .from("studio-logos")
              .upload(data.user.id + "/logo.png", blob, { upsert: true, contentType: "image/png" });
            if (upload.error) throw upload.error;
            const signed = await client.storage
              .from("studio-logos")
              .createSignedUrl(data.user.id + "/logo.png", 60 * 60 * 24 * 365);
            logoUrl = signed.data?.signedUrl ?? data.user.id + "/logo.png";
          }
          const update = await client
            .from("profiles")
            .update({
              full_name: name,
              cap_number: capNumber,
              studio_name: studioName,
              ruc,
              studio_address: address,
              brand_primary: brandPrimary,
              brand_secondary: brandSecondary,
              logo_url: logoUrl,
            })
            .eq("id", data.user.id);
          if (update.error) throw update.error;
        }
      }
    } catch {
      remoteFailed = true;
    }
    setNotice(
      remoteFailed
        ? "Perfil guardado en este dispositivo. No se pudo respaldar en tu cuenta."
        : "Perfil guardado.",
    );
  }

  // The logo is saved as soon as it changes: the proposal PDF reads it from
  // IndexedDB, so it must not depend on pressing "Guardar perfil" afterwards.
  async function changeLogo(file: File): Promise<void> {
    try {
      const dataUrl = await prepareLogo(file);
      setLogoDataUrl(dataUrl);
      await saveStudioProfile({ logoDataUrl: dataUrl });
      setNotice("Logo guardado. Aparecerá en la portada de tus propuestas.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo preparar el logo.");
    }
  }

  // Like the logo, the photo is saved locally right away; the Supabase copy is
  // best effort so the feature keeps working offline or in local mode.
  async function syncAvatarRemote(dataUrl: string | null): Promise<boolean> {
    try {
      const client = createClient();
      if (!client) return true;
      const { data } = await client.auth.getUser();
      if (!data.user) return true;
      const path = data.user.id + "/avatar.jpg";
      let avatarUrl: string | null = null;
      if (dataUrl) {
        const blob = await (await fetch(dataUrl)).blob();
        const upload = await client.storage
          .from("avatars")
          .upload(path, blob, { upsert: true, contentType: "image/jpeg" });
        if (upload.error) throw upload.error;
        const signed = await client.storage
          .from("avatars")
          .createSignedUrl(path, 60 * 60 * 24 * 365);
        avatarUrl = signed.data?.signedUrl ?? path;
      } else {
        await client.storage.from("avatars").remove([path]);
      }
      const update = await client
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("id", data.user.id);
      if (update.error) throw update.error;
      return true;
    } catch {
      return false;
    }
  }

  async function changeAvatar(file: File): Promise<void> {
    setAvatarBusy(true);
    try {
      const dataUrl = await prepareAvatar(file);
      setAvatarDataUrl(dataUrl);
      await saveStudioProfile({ avatarDataUrl: dataUrl });
      const synced = await syncAvatarRemote(dataUrl);
      setNotice(
        synced
          ? "Foto de perfil actualizada."
          : "Foto guardada en este dispositivo. No se pudo sincronizar con tu cuenta.",
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo preparar la foto.");
    } finally {
      setAvatarBusy(false);
    }
  }

  async function removeAvatar(): Promise<void> {
    setAvatarDataUrl(null);
    await saveStudioProfile({ avatarDataUrl: null });
    await syncAvatarRemote(null);
    setNotice("Foto de perfil quitada.");
  }

  function handleAvatarInput(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    // Reset so picking the same photo again still fires onChange.
    event.target.value = "";
    if (file) void changeAvatar(file);
  }

  async function removeLogo(): Promise<void> {
    setLogoDataUrl(null);
    await saveStudioProfile({ logoDataUrl: null });
    setNotice("Logo quitado.");
  }

  async function choosePlan(plan: Plan, provider: PaymentProvider): Promise<void> {
    if (plan === "free") return;
    if (nativePlatform) return;
    if (!paymentProviders[provider]) {
      setNotice(DEMO_PAYMENT_MESSAGE);
      return;
    }
    if (!configured) {
      setNotice("Pasarela en modo demo / sin configurar");
      return;
    }
    const response = await fetch("/api/payments/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, cycle: billingCycle, provider }),
    });
    const data = (await response.json()) as { init_point?: string; error?: string };
    if (!response.ok || !data.init_point) {
      setNotice(data.error ?? "No se pudo iniciar el checkout.");
      return;
    }
    window.location.assign(data.init_point);
  }

  async function verifyStudent(): Promise<void> {
    if (!configured) {
      setNotice("La verificación de estudiante necesita una cuenta; aún no está disponible aquí.");
      return;
    }
    const client = createClient();
    const { data } = client ? await client.auth.getUser() : { data: { user: null } };
    if (!client || !data.user) {
      setNotice("Inicia sesión para verificar tu cuenta de estudiante.");
      return;
    }

    // A confirmed .edu.pe account is verified on the spot.
    if (isEduPeEmail(data.user.email ?? "")) {
      const response = await fetch("/api/student/verify", { method: "POST" });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (response.ok) {
        invalidatePlanSnapshot();
        setNotice("Correo institucional verificado. Ya puedes elegir el plan Estudiante.");
        window.setTimeout(() => window.location.reload(), 1200);
      } else {
        setNotice(body.error ?? "No se pudo verificar tu correo institucional.");
      }
      return;
    }

    if (!document) {
      setNotice(
        "Tu cuenta no usa un correo .edu.pe. Adjunta tu carné o constancia de estudios (PDF o imagen).",
      );
      return;
    }
    const path = data.user.id + "/" + Date.now() + "-" + document.name;
    const upload = await client.storage.from("student-docs").upload(path, document);
    setNotice(
      upload.error
        ? "No se pudo subir el documento."
        : "Documento enviado. El equipo lo revisará y activará tu descuento.",
    );
  }

  async function syncNow(): Promise<void> {
    setNotice(describeSyncResult(await runSync()));
  }

  async function resetLocal(): Promise<void> {
    const confirmed = await confirmDialog({
      title: "¿Restablecer los datos de este dispositivo?",
      message:
        "Se borrarán los proyectos, metrados y cotizaciones guardados aquí. Lo que ya esté respaldado en tu cuenta se volverá a descargar.",
      confirmLabel: "Restablecer",
      danger: true,
    });
    if (!confirmed) return;
    await db?.delete();
    // The connection is closed after deleting: reload so the app reopens and reseeds it.
    window.location.reload();
  }

  return (
    <div className="account-page">
      <div className="eyebrow">CUENTA / CONFIGURACIÓN</div>
      <div className="page-heading-row">
        <div>
          <h1 className="page-title">Tu espacio TRAZZO</h1>
          <p className="lead">
            Planes, identidad y sincronización para continuar tu trabajo en obra.
          </p>
        </div>
        <Badge variant={configured ? "ok" : "por-verificar"}>
          {configured ? "Cuentas activas" : "Solo en este dispositivo"}
        </Badge>
      </div>

      {!configured && (
        <div className="notice-banner">
          <Cloud size={17} />
          <span>
            Las cuentas y el respaldo en la nube aún no están activos en esta instalación. Todo lo
            que hagas se guarda en este dispositivo y sigue funcionando.
          </span>
        </div>
      )}

      <div className="account-grid">
        <Card className="profile-card">
          <div className="eyebrow">PERFIL</div>
          <h2>{email || "Trabajo local"}</h2>
          <div className="avatar-picker">
            <div className="avatar-preview" aria-busy={avatarBusy}>
              {avatarDataUrl ? (
                <img src={avatarDataUrl} alt="Foto de perfil" />
              ) : (
                <span aria-hidden="true">{initials(name || email)}</span>
              )}
            </div>
            <div className="avatar-picker-body">
              <strong>Foto de perfil</strong>
              <div className="inline-actions">
                <Button
                  size="sm"
                  disabled={avatarBusy}
                  onClick={() => cameraInputRef.current?.click()}
                >
                  <Camera size={14} /> Tomar foto
                </Button>
                <Button
                  size="sm"
                  disabled={avatarBusy}
                  onClick={() => galleryInputRef.current?.click()}
                >
                  <Images size={14} /> Galería
                </Button>
                <Button
                  size="sm"
                  disabled={avatarBusy}
                  onClick={() => filesInputRef.current?.click()}
                >
                  <FolderOpen size={14} /> Archivos
                </Button>
                {avatarDataUrl && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={avatarBusy}
                    onClick={() => void removeAvatar()}
                  >
                    <Trash2 size={14} /> Quitar
                  </Button>
                )}
              </div>
              <span className="muted small">
                {avatarBusy
                  ? "Preparando foto…"
                  : "JPG, PNG, WebP o HEIC. Se recorta en cuadrado y se guarda al instante."}
              </span>
            </div>
            {/* Camera: opens the front camera directly on phones. */}
            <input
              ref={cameraInputRef}
              hidden
              type="file"
              accept="image/*"
              capture="user"
              onChange={handleAvatarInput}
            />
            {/* Gallery: the image/* wildcard opens the photo library / gallery. */}
            <input
              ref={galleryInputRef}
              hidden
              type="file"
              accept="image/*"
              onChange={handleAvatarInput}
            />
            {/* Files: explicit types open the file manager / documents picker. */}
            <input
              ref={filesInputRef}
              hidden
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.gif,.heic,.heif"
              onChange={handleAvatarInput}
            />
          </div>
          <div className="field">
            <label>Correo</label>
            <Input value={email} readOnly placeholder="No hay sesión activa" />
          </div>
          <div className="field">
            <label>Nombre</label>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nombre profesional"
            />
          </div>
          <div className="field">
            <label>
              N° de Colegiatura CAP <span className="muted">(opcional)</span>
            </label>
            <Input
              value={capNumber}
              onChange={(event) => setCapNumber(event.target.value)}
              placeholder="N° de Colegiatura CAP (opcional)"
            />
          </div>
          <Button variant="primary" onClick={() => void saveProfile()}>
            Guardar perfil
          </Button>
          <p className="legal">
            Se guardan en este dispositivo y aparecen en tus propuestas de honorarios. Con una
            cuenta también se respaldan en la nube.
          </p>
        </Card>

        <Card className="studio-brand-card">
          <div className="eyebrow">ESTUDIO / MARCA</div>
          <div className="logo-dropzone">
            <div className="logo-tile">
              {logoDataUrl ? <img src={logoDataUrl} alt="Logo del estudio" /> : <span>LOGO</span>}
            </div>
            <div className="inline-actions">
              <Button size="sm" onClick={() => logoInputRef.current?.click()}>
                Subir logo
              </Button>
              {logoDataUrl && (
                <Button size="sm" variant="ghost" onClick={() => void removeLogo()}>
                  Quitar
                </Button>
              )}
            </div>
            <input
              ref={logoInputRef}
              hidden
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void changeLogo(file);
              }}
            />
          </div>
          <div className="field">
            <label htmlFor="studio-name">Nombre del Estudio / Empresa</label>
            <Input
              id="studio-name"
              value={studioName}
              onChange={(event) => setStudioName(event.target.value)}
              placeholder="B & E Arquitectura"
            />
          </div>
          <div className="field">
            <label htmlFor="studio-ruc">RUC</label>
            <Input
              id="studio-ruc"
              inputMode="numeric"
              aria-invalid={!isValidRuc(ruc)}
              value={ruc}
              onChange={(event) => setRuc(event.target.value)}
              className={!isValidRuc(ruc) ? "error" : ""}
            />
            {!isValidRuc(ruc) && (
              <span className="danger small">
                RUC inválido: usa 11 dígitos con prefijo 10, 15, 17 o 20.
              </span>
            )}
          </div>
          <div className="field">
            <label htmlFor="studio-address">Ciudad / Dirección</label>
            <Input
              id="studio-address"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="Lima, Perú"
            />
          </div>
          <div className="color-fields">
            <label>
              Color principal{" "}
              <Input
                type="color"
                value={brandPrimary}
                onChange={(event) => setBrandPrimary(event.target.value)}
              />
              <Input
                aria-label="Color principal en hexadecimal"
                value={brandPrimary}
                onChange={(event) => setBrandPrimary(event.target.value)}
              />
            </label>
            <label>
              Color de acento{" "}
              <Input
                type="color"
                value={brandSecondary}
                onChange={(event) => setBrandSecondary(event.target.value)}
              />
              <Input
                aria-label="Color de acento en hexadecimal"
                value={brandSecondary}
                onChange={(event) => setBrandSecondary(event.target.value)}
              />
            </label>
          </div>
          <Button
            variant="ghost"
            onClick={() => {
              setBrandPrimary("#13294B");
              setBrandSecondary("#C59B27");
            }}
          >
            Restablecer colores
          </Button>
          <div className="brand-preview-strip">
            <span style={{ background: brandPrimary }} />
            <span style={{ background: brandSecondary }} />
            <strong>{studioName || "TRAZZO"}</strong>
          </div>
        </Card>
        <Card>
          <div className="eyebrow">PANTALLA</div>
          <h2>Tema y tamaño de letra</h2>
          <DisplaySettings />
        </Card>
        <Card>
          <div className="eyebrow">SINCRONIZACIÓN</div>
          <h2>{sync.online ? "Listo para sincronizar" : "Trabajando sin conexión"}</h2>
          <div className="sync-details">
            <span>
              Estado <strong>{sync.online ? "En línea" : "Sin conexión"}</strong>
            </span>
            <span>
              Cola <strong className="mono">{sync.pending} cambios</strong>
            </span>
            <span>
              Último sync{" "}
              <strong>
                {sync.lastSync ? new Date(sync.lastSync).toLocaleString("es-PE") : "Nunca"}
              </strong>
            </span>
          </div>
          <div className="hero-actions">
            <Button onClick={() => void syncNow()} disabled={!sync.online}>
              <RefreshCw size={15} /> Sincronizar ahora
            </Button>
            <Button variant="danger" onClick={() => void resetLocal()}>
              <RotateCcw size={15} /> Restablecer datos
            </Button>
          </div>
        </Card>
      </div>

      <section className="account-section">
        <div className="eyebrow">PLANES</div>
        <BillingToggle value={billingCycle} onChange={setBillingCycle} />
        {nativePlatform !== null && (
          <div className="payment-mode-banner" role="status">
            {nativePlatform ? (
              <>
                <strong>App nativa: compras desactivadas</strong>
                <span>
                  Tu estado de cuenta se sincroniza automáticamente al iniciar sesión. Plan actual:{" "}
                  <strong>{billingViewState(true, currentPlan, paymentProviders).currentPlanLabel}</strong>.
                </span>
              </>
            ) : (
              <>
                <strong>Checkout web</strong>
                <span>
                  {billingViewState(false, currentPlan, paymentProviders).message}
                </span>
              </>
            )}
          </div>
        )}
        <div className="plan-grid">
          {(Object.entries(PLANS) as Array<[Plan, (typeof PLANS)[Plan]]>).map(
            ([plan, definition]) => (
              <Card className={"plan-card " + (currentPlan === plan ? "current" : "")} key={plan}>
                {currentPlan === plan && <Badge variant="ok">Plan actual</Badge>}
                <div className="plan-name">{definition.label}</div>
                <div className="price">
                  {formatPlanPrice(plan, billingCycle)}
                  {plan !== "free" && billingCycle === "annual" && (
                    <small className="muted plan-equivalent">
                      ≈ S/ {monthlyEquivalent(plan, billingCycle).toFixed(2)} / mes · ahorra{" "}
                      {Math.round(
                        (1 - definition.prices.annual / (definition.prices.monthly * 12)) * 100,
                      )}
                      %
                    </small>
                  )}
                </div>
                <ul>
                  {features[plan].map((feature) => (
                    <li key={feature}>
                      <Check size={14} className="text-accent" /> {feature}
                    </li>
                  ))}
                </ul>
                {plan === "free" ? (
                  <Button variant="secondary" disabled>
                    {currentPlan === plan ? "Plan actual" : "Incluido"}
                  </Button>
                ) : (
                  nativePlatform === false && (
                    <div className="plan-actions">
                      <Button
                        variant={plan === "pro" ? "primary" : "secondary"}
                        onClick={() => void choosePlan(plan, "mercadopago")}
                        disabled={currentPlan === plan}
                      >
                        {currentPlan === plan ? "Activo" : "Mercado Pago"}
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => void choosePlan(plan, "culqi")}
                        disabled={currentPlan === plan}
                      >
                        Culqi
                      </Button>
                    </div>
                  )
                )}
              </Card>
            ),
          )}
        </div>
      </section>

      <section className="account-grid account-section">
        <Card>
          <div className="eyebrow">VERIFICACIÓN ESTUDIANTE</div>
          <h2>50% de descuento</h2>
          <p className="muted small">
            Si tu cuenta usa un correo .edu.pe confirmado, se verifica al instante. Si no, adjunta
            tu carné o constancia y el equipo la revisa.
          </p>
          <p className="small">
            Cuenta: <strong>{email || "sin sesión iniciada"}</strong>
          </p>
          <label className="file-input">
            <FileUp size={15} /> <span>{document?.name ?? "Adjuntar documento"}</span>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(event) => setDocument(event.target.files?.[0] ?? null)}
            />
          </label>
          <Button onClick={() => void verifyStudent()} disabled={studentVerified}>
            {studentVerified ? "Verificación aprobada" : "Solicitar verificación"}
          </Button>
        </Card>
        <Card>
          <div className="eyebrow">APLICACIÓN</div>
          <h2>TRAZZO · RNE Pro Perú</h2>
          <div className="app-info">
            <span>Versión</span>
            <span className="mono">0.1.0</span>
            <span>Catálogo</span>
            <span className="mono">v{SEED_VERSION}</span>
          </div>
          <Link href="/normativa" className="btn">
            <FileUp size={15} /> Revisar fichas
          </Link>
        </Card>
      </section>

      <section className="account-grid account-section">
        <BackupCard plan={currentPlan} />
        <Card>
          <div className="eyebrow">INICIO</div>
          <h2>Tus herramientas</h2>
          <FavoriteToolsEditor />
        </Card>
        <Card>
          <div className="eyebrow">INSTALACIÓN</div>
          <h2>TRAZZO en tu pantalla de inicio</h2>
          <InstallGuide />
        </Card>
      </section>

      <p className="legal">
        Valores referenciales según la edición indicada del RNE. Verifica la versión vigente
        publicada por el MVCS antes de usar en expedientes.
      </p>
    </div>
  );
}

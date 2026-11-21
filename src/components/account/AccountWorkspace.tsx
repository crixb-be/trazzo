"use client";

import {
  Camera,
  Check,
  Cloud,
  FileUp,
  FolderOpen,
  Github,
  ImageUp,
  Images,
  RotateCcw,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
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
import { AccountAccess } from "./AccountAccess";
import { BackupCard } from "./BackupCard";
import { OnboardingButton } from "@/components/onboarding/Onboarding";
import { APP_INFO } from "@/lib/app-info";
import { WelcomeGuideButton } from "@/components/onboarding/WelcomeGuide";
import { InstallGuide } from "@/components/onboarding/InstallGuide";
import { SEED_VERSION } from "@/data/seed-rne";
import type { StudioProfile } from "@/lib/offline/db";
import { getActiveDatabase, GUEST_WORKSPACE } from "@/lib/offline/workspace";
import { useWorkspace } from "@/components/layout/WorkspaceProvider";
import { getStudioProfile, saveStudioProfile } from "@/lib/offline/profile";
import { describeProfileSave } from "@/lib/offline/profile-sync";
import { syncNow } from "@/lib/offline/sync";
import { useStudioProfile, useSyncStatus } from "@/lib/offline/hooks";
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
import { BrandMark } from "@/components/brand/BrandMark";
import { useAccountAvatar } from "@/lib/account/use-account-avatar";
import { prepareLogo } from "@/lib/ui/logo";
import { isValidRuc } from "@/lib/validation";

const features: Record<Plan, string[]> = {
  free: [
    "Todas las calculadoras",
    "Fichas básicas",
    "1 proyecto",
    "Cupo diario de consultas al asistente",
    "PDF con marca de agua",
  ],
  student: [
    "Fichas Pro",
    "Proyectos ilimitados",
    "Cupo ampliado de consultas al asistente",
    "PDF limpio",
  ],
  pro: [
    "Fichas verificadas avanzadas",
    "Proyectos ilimitados",
    "Cupo ampliado de consultas IA",
    "Exportación completa",
  ],
};

function initials(source: string): string {
  const words = source
    .replace(/@.*$/, "")
    .split(/[\s._-]+/)
    .filter(Boolean);
  const letters = words.slice(0, 2).map((word) => word[0]?.toUpperCase() ?? "");
  return letters.join("");
}

export function AccountWorkspace() {
  const sync = useSyncStatus();
  const studio = useStudioProfile();
  const accountAvatar = useAccountAvatar();
  const [configured, setConfigured] = useState(Boolean(createClient()));
  const [email, setEmail] = useState("");
  const { plan: currentPlan, studentVerified } = useCurrentPlan();
  const { id: workspaceId } = useWorkspace();
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
    setConfigured(Boolean(createClient()));
  }, []);

  // AccountAccess owns the session. The profile itself arrives through the sync pass
  // (sign-in, reload with a session, "Sincronizar ahora"): it writes IndexedDB and the
  // useStudioProfile live query refreshes these fields without a reload.
  const handleSessionChange = useCallback((sessionEmail: string | null): void => {
    setEmail(sessionEmail ?? "");
  }, []);

  /** Saves on the device first, then backs the profile up at once when signed in. */
  async function saveAndBackUp(patch: Partial<StudioProfile>): Promise<string> {
    await saveStudioProfile(patch);
    const result = await syncNow();
    const notice = describeProfileSave(result.status);
    // A failed backup names its cause (e.g. a missing migration) instead of hiding it.
    return result.error && (result.status === "partial" || result.status === "error")
      ? notice + " Motivo: " + result.error
      : notice;
  }

  async function saveProfile(): Promise<void> {
    setNotice(
      await saveAndBackUp({
        fullName: name,
        capNumber,
        studioName,
        ruc,
        address,
        brandPrimary,
        brandSecondary,
        logoDataUrl,
      }),
    );
  }

  // The logo is saved as soon as it changes: the proposal PDF reads it from
  // IndexedDB, so it must not depend on pressing "Guardar perfil" afterwards.
  async function changeLogo(file: File): Promise<void> {
    const local = getActiveDatabase();
    try {
      const dataUrl = await prepareLogo(file);
      if (local !== getActiveDatabase()) return;
      setLogoDataUrl(dataUrl);
      const notice = await saveAndBackUp({ logoDataUrl: dataUrl });
      setNotice("Logo listo para tus propuestas. " + notice);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo preparar el logo.");
    }
  }

  async function changeAvatar(file: File): Promise<void> {
    const local = getActiveDatabase();
    setAvatarBusy(true);
    try {
      const dataUrl = await prepareAvatar(file);
      if (local !== getActiveDatabase()) return;
      setAvatarDataUrl(dataUrl);
      setNotice("Foto actualizada. " + (await saveAndBackUp({ avatarDataUrl: dataUrl })));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo preparar la foto.");
    } finally {
      setAvatarBusy(false);
    }
  }

  async function removeAvatar(): Promise<void> {
    setAvatarDataUrl(null);
    setNotice("Foto quitada. " + (await saveAndBackUp({ avatarDataUrl: null })));
  }

  function handleAvatarInput(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    // Reset so picking the same photo again still fires onChange.
    event.target.value = "";
    if (file) void changeAvatar(file);
  }

  async function removeLogo(): Promise<void> {
    setLogoDataUrl(null);
    setNotice("Logo quitado. " + (await saveAndBackUp({ logoDataUrl: null })));
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

  async function resetLocal(): Promise<void> {
    if (workspaceId !== GUEST_WORKSPACE) return;
    const local = getActiveDatabase();
    const confirmed = await confirmDialog({
      title: "¿Restablecer los datos de este dispositivo?",
      message:
        "Se borrarán los proyectos, metrados y cotizaciones guardados en el espacio sin cuenta.",
      confirmLabel: "Restablecer",
      danger: true,
    });
    if (!confirmed || local !== getActiveDatabase()) return;
    await local.delete();
    // The connection is closed after deleting: reload so the app reopens and reseeds it.
    window.location.reload();
  }

  return (
    <div className="account-page">
      <div className="eyebrow">Cuenta / Configuración</div>
      <div className="page-heading-row">
        <div>
          <h1 className="page-title">Tu espacio TRAZZO</h1>
          <p className="lead">
            Planes, identidad y sincronización para continuar tu trabajo en obra.
          </p>
        </div>
        <Badge variant={configured ? "ok" : "por-verificar"}>
          {!configured ? "Solo en este dispositivo" : email ? "Sesión iniciada" : "Modo invitado"}
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

      <AccountAccess onSessionChange={handleSessionChange} />

      <div className="account-grid account-section">
        <Card className="profile-card">
          <div className="eyebrow">Perfil</div>
          <h2>{email || "Trabajo local"}</h2>
          <div className="avatar-picker">
            <div className="avatar-preview" aria-busy={avatarBusy}>
              {avatarDataUrl ? (
                // The avatar is already resized on the device and stored as a data URL.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarDataUrl} alt="Foto de perfil" />
              ) : accountAvatar.src ? (
                // No own photo yet: the sign-in provider's photo stands in.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={accountAvatar.src} alt="Foto de tu cuenta" referrerPolicy="no-referrer" />
              ) : initials(name || email) ? (
                <span aria-hidden="true">{initials(name || email)}</span>
              ) : (
                // No photo and no name yet: show TRAZZO's mark instead of a stray letter.
                <BrandMark size={84} className="avatar-mark" />
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

        <Card className="studio-brand-card" id="datos-estudio">
          <div className="eyebrow">Estudio / Marca</div>
          <div className="logo-dropzone">
            <div className="logo-tile">
              {logoDataUrl ? (
                // The logo is already resized on the device and stored as a data URL.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoDataUrl} alt="Logo del estudio" />
              ) : (
                <span className="logo-tile-empty">
                  <ImageUp size={20} aria-hidden="true" />
                  <span>Sin logo · PNG, JPG, WebP o SVG</span>
                </span>
              )}
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
          <div className="eyebrow">Pantalla</div>
          <h2>Tema y tamaño de letra</h2>
          <DisplaySettings />
          <WelcomeGuideButton />
        </Card>
        {workspaceId === GUEST_WORKSPACE && (
          <Card>
            <div className="eyebrow">Datos del dispositivo</div>
            <h2>{sync.online ? "En línea" : "Trabajando sin conexión"}</h2>
            <p className="muted small">
              Restablece los datos guardados en el espacio sin cuenta de este dispositivo.
            </p>
            <div className="hero-actions">
              <Button variant="danger" onClick={() => void resetLocal()}>
                <RotateCcw size={15} /> Restablecer datos
              </Button>
            </div>
          </Card>
        )}
      </div>

      <section className="account-section">
        <div className="eyebrow">Planes</div>
        <BillingToggle value={billingCycle} onChange={setBillingCycle} />
        {nativePlatform !== null && (
          <div className="payment-mode-banner" role="status">
            {nativePlatform ? (
              <>
                <strong>App nativa: compras desactivadas</strong>
                <span>
                  Tu estado de cuenta se sincroniza automáticamente al iniciar sesión. Plan actual:{" "}
                  <strong>
                    {billingViewState(true, currentPlan, paymentProviders).currentPlanLabel}
                  </strong>
                  .
                </span>
              </>
            ) : (
              <>
                <strong>Checkout web</strong>
                <span>{billingViewState(false, currentPlan, paymentProviders).message}</span>
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
          <div className="eyebrow">Verificación estudiante</div>
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
          <div className="eyebrow">Aplicación</div>
          <h2>TRAZZO</h2>
          <p className="muted small">Del estudio a la obra</p>
          <div className="app-info">
            <span>Versión</span>
            <span className="mono">{APP_INFO.version}</span>
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
          <div className="eyebrow">Instalación</div>
          <h2>TRAZZO en tu pantalla de inicio</h2>
          <InstallGuide />
          <OnboardingButton />
        </Card>
      </section>

      <p className="legal">
        Valores referenciales según la edición indicada del RNE. Verifica la versión vigente
        publicada por el MVCS antes de usar en expedientes.
      </p>

      <section className="card developer-card" aria-labelledby="developer-title">
        <h2 id="developer-title">Información del desarrollador</h2>
        <div className="developer-profile">
          {APP_INFO.developer.photoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="developer-avatar"
              src={APP_INFO.developer.photoSrc}
              width={48}
              height={48}
              alt="Foto de Cristhian Bustamante"
            />
          ) : (
            <span className="developer-avatar" aria-hidden="true">
              CB
            </span>
          )}
          <div className="developer-copy">
            <strong>{APP_INFO.developer.name}</strong>
            <p className="muted small">{APP_INFO.developer.subtitle}</p>
            <p className="mono small">
              {APP_INFO.name} · v{APP_INFO.version}
            </p>
            <div className="developer-stack">
              {APP_INFO.stack.map((item) => (
                <span className="badge" key={item}>
                  {item}
                </span>
              ))}
            </div>
            <a
              className="source-link"
              href={APP_INFO.developer.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub de Cristhian Bustamante"
            >
              <Github size={16} aria-hidden="true" /> GitHub
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

"use client";

import { Check, Cloud, Download, FileUp, RefreshCw, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Badge, BillingToggle, Button, Card, Input } from "@/components/ui";
import { SEED_VERSION } from "@/data/seed-rne";
import { db } from "@/lib/offline/db";
import { getStudioProfile, saveStudioProfile } from "@/lib/offline/profile";
import { useStudioProfile, useSyncStatus } from "@/lib/offline/hooks";
import { flushOutbox, pullRemote } from "@/lib/offline/sync";
import {
  formatPlanPrice,
  isEduPeEmail,
  monthlyEquivalent,
  PLANS,
  type BillingCycle,
  type Plan,
} from "@/lib/plans/plans";
import { createClient } from "@/lib/supabase/client";
import { prepareLogo } from "@/lib/ui/logo";
import { isValidRuc } from "@/lib/validation";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const features: Record<Plan, string[]> = {
  free: ["Fichas básicas", "1 proyecto local", "10 consultas IA / mes"],
  student: ["Fichas Pro", "Proyectos ilimitados", "200 consultas IA / mes", "Exportación PDF"],
  pro: ["Fichas Pro", "Proyectos ilimitados", "IA ilimitada", "Exportación PDF"],
};

export function AccountWorkspace() {
  const sync = useSyncStatus();
  const studio = useStudioProfile();
  const [configured, setConfigured] = useState(Boolean(createClient()));
  const [email, setEmail] = useState("");
  const [currentPlan, setCurrentPlan] = useState<Plan>("free");
  const [studentVerified, setStudentVerified] = useState(false);
  const [studentEmail, setStudentEmail] = useState("");
  const [name, setName] = useState("");
  const [capNumber, setCapNumber] = useState("");
  const [studioName, setStudioName] = useState("");
  const [ruc, setRuc] = useState("");
  const [address, setAddress] = useState("");
  const [brandPrimary, setBrandPrimary] = useState("#13294B");
  const [brandSecondary, setBrandSecondary] = useState("#C59B27");
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [document, setDocument] = useState<File | null>(null);
  const [notice, setNotice] = useState("");
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

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
    }
  }, [studio.updatedAt]);

  useEffect(() => {
    const client = createClient();
    setConfigured(Boolean(client));
    if (client) {
      void client.auth.getUser().then(async ({ data }) => {
        if (!data.user) return;
        setEmail(data.user.email ?? "");
        setStudentEmail(data.user.email ?? "");
        const profile = await client
          .from("profiles")
          .select("plan,student_verified,full_name,cap_number")
          .eq("id", data.user.id)
          .maybeSingle();
        if (profile.data?.plan === "student" || profile.data?.plan === "pro") {
          setCurrentPlan(profile.data.plan);
        }
        setStudentVerified(Boolean(profile.data?.student_verified));
        if (typeof profile.data?.full_name === "string") setName(profile.data.full_name);
        if (typeof profile.data?.cap_number === "string") setCapNumber(profile.data.cap_number);
      });
    }

    function handleInstall(event: Event): void {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", handleInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleInstall);
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
        ? "Perfil guardado localmente. No se pudo sincronizar la marca con Supabase."
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

  async function removeLogo(): Promise<void> {
    setLogoDataUrl(null);
    await saveStudioProfile({ logoDataUrl: null });
    setNotice("Logo quitado.");
  }

  async function choosePlan(plan: Plan): Promise<void> {
    if (plan === "free") return;
    if (!configured) {
      setNotice("Configura Supabase para activar pagos y sincronización.");
      return;
    }
    const response = await fetch("/api/payments/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, cycle: billingCycle }),
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
      setNotice("Configura Supabase para activar la verificación.");
      return;
    }
    if (isEduPeEmail(studentEmail)) {
      setNotice("Solicitud enviada. Revisa tu correo institucional para continuar.");
      return;
    }
    const client = createClient();
    if (!client || !document) {
      setNotice("Usa un correo .edu.pe o selecciona un documento PDF/JPG.");
      return;
    }
    const { data } = await client.auth.getUser();
    if (!data.user) {
      setNotice("Inicia sesión para enviar un documento.");
      return;
    }
    const path = data.user.id + "/" + Date.now() + "-" + document.name;
    const upload = await client.storage.from("student-docs").upload(path, document);
    setNotice(upload.error ? "No se pudo subir el documento." : "Documento enviado para revisión.");
  }

  async function syncNow(): Promise<void> {
    try {
      await flushOutbox();
      await pullRemote();
      setNotice("Sincronización completada.");
    } catch {
      setNotice("No se pudo sincronizar; tus datos locales están intactos.");
    }
  }

  async function resetLocal(): Promise<void> {
    if (!window.confirm("¿Restablecer todos los proyectos y datos locales?")) return;
    await db?.delete();
    setNotice("Datos locales restablecidos. Recarga para volver a sembrar las fichas.");
  }

  async function installApp(): Promise<void> {
    if (!installPrompt) return;
    await installPrompt.prompt();
    setInstallPrompt(null);
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
          {configured ? "Supabase activo" : "Modo local"}
        </Badge>
      </div>

      {!configured && (
        <div className="notice-banner">
          <Cloud size={17} />
          <span>
            Configura Supabase para activar cuentas, sincronización y pagos. Las fichas,
            calculadoras y metrados locales siguen funcionando.
          </span>
        </div>
      )}

      <div className="account-grid">
        <Card className="profile-card">
          <div className="eyebrow">PERFIL</div>
          <h2>{email || "Trabajo local"}</h2>
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
            sesión de Supabase también se sincronizan con tu cuenta.
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
                <Button
                  variant={plan === "pro" ? "primary" : "secondary"}
                  onClick={() => void choosePlan(plan)}
                  disabled={currentPlan === plan}
                >
                  {currentPlan === plan ? "Activo" : "Elegir " + definition.label}
                </Button>
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
            Usa un correo .edu.pe o envía un documento. La revisión la realiza el equipo.
          </p>
          <Input
            type="email"
            value={studentEmail}
            onChange={(event) => setStudentEmail(event.target.value)}
            placeholder="nombre@universidad.edu.pe"
          />
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
            <span>Seed</span>
            <span className="mono">v{SEED_VERSION}</span>
          </div>
          {installPrompt && (
            <Button variant="ghost" onClick={() => void installApp()}>
              <Download size={15} /> Instalar aplicación
            </Button>
          )}
          <Link href="/normativa" className="btn">
            <FileUp size={15} /> Revisar fichas
          </Link>
        </Card>
      </section>

      {notice && <p className="warning account-notice">{notice}</p>}
      <p className="legal">
        Valores referenciales según la edición indicada del RNE. Verifica la versión vigente
        publicada por el MVCS antes de usar en expedientes.
      </p>
    </div>
  );
}

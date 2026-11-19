import "fake-indexeddb/auto";
import { createClient as createSupabase } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StudioProfile } from "./db";

type TestSession = { user: { id: string }; access_token: string } | null;
const auth = vi.hoisted(() => ({
  session: null as TestSession,
  fetch: vi.fn<typeof fetch>(),
  compress: vi.fn<(dataUrl: string, maxBytes: number) => Promise<string | null>>(),
}));

vi.mock("./db", async (load) => {
  const actual = await load<typeof import("./db")>();
  return { ...actual, db: new actual.TrazzoDB() };
});
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getSession: async () => ({ data: { session: auth.session }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
    },
  }),
  createSyncClient: (accessToken: string) =>
    createSupabase("https://cloud.example.test", "test-key", {
      accessToken: async () => accessToken,
      global: { fetch: auth.fetch },
    }),
}));
vi.mock("@/lib/plans/plan-store", () => ({ loadPlanSnapshot: async () => ({ plan: "free" }) }));
vi.mock("@/lib/ui/image-budget", () => ({
  compressImageForSync: (dataUrl: string, maxBytes: number) => auth.compress(dataUrl, maxBytes),
}));

import { db } from "./db";
import { DEFAULT_STUDIO_PROFILE, getStudioProfile, saveStudioProfile } from "./profile";
import {
  MAX_SYNC_IMAGE_BYTES,
  PROFILE_DIRTY,
  dataUrlBytes,
  describeProfileSave,
  planProfileSync,
  profileToRow,
  rowToProfile,
  type ProfileRow,
} from "./profile-sync";
import { getSyncStatus, syncNow } from "./sync";

const database = db!;
/** ~3 KB JPEG-like data URL. */
const PHOTO = "data:image/jpeg;base64," + "QUJD".repeat(1000);
const LOGO = "data:image/png;base64," + "TE9H".repeat(1500);
/** ~225 KB: over the 150 KB budget. */
const HUGE_LOGO = "data:image/png;base64," + "R0lG".repeat(75_000);
const SMALL_LOGO = "data:image/png;base64," + "c21h".repeat(800);

const profile = (patch: Partial<StudioProfile> = {}): StudioProfile => ({
  ...DEFAULT_STUDIO_PROFILE,
  ...patch,
});

const row = (patch: Partial<ProfileRow> = {}): ProfileRow => ({
  full_name: null,
  cap_number: null,
  studio_name: null,
  ruc: null,
  studio_address: null,
  brand_primary: null,
  brand_secondary: null,
  avatar_data_url: null,
  logo_data_url: null,
  profile_updated_at: null,
  ...patch,
});

describe("reglas de reconciliación del perfil", () => {
  it("mide el tamaño real de una imagen base64", () => {
    expect(dataUrlBytes("data:image/png;base64,QUJD")).toBe(3);
    expect(dataUrlBytes("data:image/png;base64,QUI=")).toBe(2);
    expect(dataUrlBytes(HUGE_LOGO)).toBeGreaterThan(MAX_SYNC_IMAGE_BYTES);
    expect(dataUrlBytes(PHOTO)).toBeLessThan(MAX_SYNC_IMAGE_BYTES);
  });

  it("sube un cambio local más nuevo y baja uno remoto más nuevo", () => {
    const local = profile({ fullName: "Ana", updatedAt: "2026-11-19T10:00:00.000Z" });
    const older = row({ full_name: "Viejo", profile_updated_at: "2026-11-18T10:00:00.000Z" });
    const newer = row({ full_name: "Nube", profile_updated_at: "2026-11-19T12:00:00.000Z" });
    expect(planProfileSync(local, true, older)).toEqual({ action: "push" });
    const pulled = planProfileSync(local, true, newer);
    expect(pulled.action).toBe("pull");
    if (pulled.action === "pull") {
      expect(pulled.profile.fullName).toBe("Nube");
      expect(pulled.profile.updatedAt).toBe("2026-11-19T12:00:00.000Z");
    }
  });

  it("no hace nada si ya coinciden, y no sube perfiles vacíos", () => {
    const at = "2026-11-19T10:00:00.000Z";
    expect(
      planProfileSync(
        profile({ fullName: "Ana", updatedAt: at }),
        false,
        row({ profile_updated_at: at }),
      ),
    ).toEqual({ action: "none" });
    expect(planProfileSync(profile(), false, row())).toEqual({ action: "none" });
  });

  it("completa una fila antigua sin versión: sube lo local o baja lo que había", () => {
    const legacy = row({ full_name: "Arq. Legado", cap_number: "12345" });
    expect(planProfileSync(profile({ studioName: "Estudio" }), false, legacy)).toEqual({
      action: "push",
    });
    const pulled = planProfileSync(profile(), false, legacy);
    expect(pulled.action).toBe("pull");
    if (pulled.action === "pull") {
      expect(pulled.profile.capNumber).toBe("12345");
      // The oldest possible version: any later edit on a device wins over it.
      expect(pulled.profile.updatedAt).toBe(new Date(0).toISOString());
    }
  });

  it("convierte perfil, empresa, colores e imágenes ida y vuelta", () => {
    const local = profile({
      fullName: " Ana Pérez ",
      capNumber: "CAP 1234",
      studioName: "Pérez Arquitectos",
      ruc: "20123456789",
      address: "Arequipa",
      brandPrimary: "#112233",
      brandSecondary: "#aa8800",
      avatarDataUrl: PHOTO,
      logoDataUrl: LOGO,
      updatedAt: "2026-11-19T10:00:00.000Z",
    });
    const sent = profileToRow(local, { avatar: PHOTO, logo: LOGO }) as ProfileRow;
    expect(sent).toMatchObject({
      full_name: "Ana Pérez",
      studio_address: "Arequipa",
      brand_primary: "#112233",
      profile_updated_at: "2026-11-19T10:00:00.000Z",
    });
    expect(rowToProfile(sent, DEFAULT_STUDIO_PROFILE)).toEqual({ ...local, fullName: "Ana Pérez" });
    // An image that could not be shrunk is left out, so the cloud keeps its copy.
    expect("logo_data_url" in profileToRow(local, { avatar: PHOTO, logo: undefined })).toBe(false);
    // Anything that is not an image data URL never reaches the device.
    expect(
      rowToProfile(row({ logo_data_url: "javascript:alert(1)" }), DEFAULT_STUDIO_PROFILE)
        .logoDataUrl,
    ).toBeNull();
  });

  it("dice al usuario lo que de verdad pasó al guardar", () => {
    expect(describeProfileSave("ok")).toMatch(/respaldado en tu cuenta/);
    expect(describeProfileSave("offline")).toMatch(/al volver la conexión/);
    expect(describeProfileSave("signed-out")).toBe("Perfil guardado en este dispositivo.");
    expect(describeProfileSave("partial")).toMatch(/se reintentará/);
  });
});

describe("sincronización del perfil con Supabase", () => {
  let cloud: Map<string, ProfileRow>;
  let connection: { onLine: boolean };
  let missingColumns: boolean;
  let patches: Array<Partial<ProfileRow>>;

  function signIn(id = "owner") {
    auth.session = { user: { id }, access_token: "session-" + id };
  }

  beforeEach(async () => {
    await database.open();
    cloud = new Map([["owner", row()]]);
    patches = [];
    missingColumns = false;
    connection = { onLine: true };
    vi.stubGlobal("navigator", connection);
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    auth.session = null;
    auth.compress.mockReset().mockResolvedValue(SMALL_LOGO);
    auth.fetch.mockReset().mockImplementation(async (input, init) => {
      const url = new URL(String(input));
      const name = url.pathname.split("/").at(-1);
      if (name !== "profiles") return Response.json([]);
      if (missingColumns) {
        return Response.json(
          { code: "42703", message: "column profiles.avatar_data_url does not exist" },
          { status: 400 },
        );
      }
      const id = url.searchParams.get("id")?.slice(3) ?? "";
      if (init?.method === "PATCH") {
        const patch = JSON.parse(String(init.body)) as Partial<ProfileRow>;
        patches.push(patch);
        if (!cloud.has(id)) return Response.json([]);
        cloud.set(id, { ...cloud.get(id)!, ...patch });
        return Response.json([{ id }]);
      }
      return Response.json(cloud.has(id) ? [cloud.get(id)] : []);
    });
  });

  afterEach(async () => {
    vi.clearAllTimers();
    vi.useRealTimers();
    await database.delete();
    vi.unstubAllGlobals();
  });

  it("al guardar con sesión sube perfil, empresa, colores, foto y logo de inmediato", async () => {
    signIn();
    const saved = await saveStudioProfile({
      fullName: "Ana Pérez",
      capNumber: "CAP 1234",
      studioName: "Pérez Arquitectos",
      ruc: "20123456789",
      address: "Arequipa",
      brandPrimary: "#112233",
      brandSecondary: "#aa8800",
      avatarDataUrl: PHOTO,
      logoDataUrl: LOGO,
    });
    const result = await syncNow();
    expect(result.status).toBe("ok");
    expect(cloud.get("owner")).toMatchObject({
      full_name: "Ana Pérez",
      cap_number: "CAP 1234",
      studio_name: "Pérez Arquitectos",
      ruc: "20123456789",
      studio_address: "Arequipa",
      brand_primary: "#112233",
      brand_secondary: "#aa8800",
      avatar_data_url: PHOTO,
      logo_data_url: LOGO,
      profile_updated_at: saved.updatedAt,
    });
    expect(await database.meta.get(PROFILE_DIRTY)).toBeUndefined();
    expect((await getSyncStatus()).pending).toBe(0);
  });

  it("sin red queda en cola y se envía al reconectar", async () => {
    signIn();
    connection.onLine = false;
    await saveStudioProfile({ fullName: "Sin señal" });
    expect((await syncNow()).status).toBe("offline");
    expect((await getSyncStatus()).pending).toBe(1);
    expect(cloud.get("owner")?.full_name).toBeNull();

    connection.onLine = true;
    expect((await syncNow()).status).toBe("ok");
    expect(cloud.get("owner")?.full_name).toBe("Sin señal");
    expect((await getSyncStatus()).pending).toBe(0);
  });

  it("al entrar en otro dispositivo descarga todo el perfil e imágenes", async () => {
    cloud.set(
      "owner",
      row({
        full_name: "Ana Pérez",
        cap_number: "CAP 1234",
        studio_name: "Pérez Arquitectos",
        ruc: "20123456789",
        studio_address: "Arequipa",
        brand_primary: "#112233",
        brand_secondary: "#aa8800",
        avatar_data_url: PHOTO,
        logo_data_url: LOGO,
        profile_updated_at: "2026-11-19T12:00:00.000Z",
      }),
    );
    signIn();
    const result = await syncNow();
    expect(result.status).toBe("ok");
    expect(result.pulled).toBeGreaterThanOrEqual(1);
    expect(await getStudioProfile()).toMatchObject({
      fullName: "Ana Pérez",
      capNumber: "CAP 1234",
      studioName: "Pérez Arquitectos",
      ruc: "20123456789",
      address: "Arequipa",
      brandPrimary: "#112233",
      brandSecondary: "#aa8800",
      avatarDataUrl: PHOTO,
      logoDataUrl: LOGO,
      updatedAt: "2026-11-19T12:00:00.000Z",
    });
    // Nothing was pushed back: the cloud copy was already the newest.
    expect(patches).toHaveLength(0);
  });

  it("gana la edición más reciente entre dispositivos", async () => {
    signIn();
    await saveStudioProfile({ studioName: "Local viejo" });
    // Another device saved later.
    cloud.set(
      "owner",
      row({
        studio_name: "Desde la tablet",
        profile_updated_at: new Date(Date.now() + 60_000).toISOString(),
      }),
    );
    await syncNow();
    expect((await getStudioProfile()).studioName).toBe("Desde la tablet");
    expect(patches).toHaveLength(0);

    await saveStudioProfile({ studioName: "Ahora desde el teléfono", updatedAt: undefined });
    // saveStudioProfile stamps now: older than the tablet's future time, so force it newer.
    await database.studio_profile.update("default", {
      updatedAt: new Date(Date.now() + 120_000).toISOString(),
    });
    await database.meta.put({ key: PROFILE_DIRTY, value: "edit" });
    await syncNow();
    expect(cloud.get("owner")?.studio_name).toBe("Ahora desde el teléfono");
  });

  it("comprime un logo de más de 150 KB antes de subirlo", async () => {
    signIn();
    await saveStudioProfile({ fullName: "Ana", logoDataUrl: HUGE_LOGO });
    await syncNow();
    expect(auth.compress).toHaveBeenCalledWith(HUGE_LOGO, MAX_SYNC_IMAGE_BYTES);
    expect(cloud.get("owner")?.logo_data_url).toBe(SMALL_LOGO);
    // The device keeps its original; only the synced copy is smaller.
    expect((await getStudioProfile()).logoDataUrl).toBe(HUGE_LOGO);
  });

  it("si un logo no se puede reducir, sincroniza el resto y conserva el de la nube", async () => {
    signIn();
    cloud.set("owner", row({ logo_data_url: LOGO }));
    auth.compress.mockResolvedValue(null);
    await saveStudioProfile({ fullName: "Ana", logoDataUrl: HUGE_LOGO });
    expect((await syncNow()).status).toBe("ok");
    expect(patches.at(-1)).not.toHaveProperty("logo_data_url");
    expect(cloud.get("owner")).toMatchObject({ full_name: "Ana", logo_data_url: LOGO });
  });

  it("sin la migración avisa qué falta y deja el perfil en cola", async () => {
    signIn();
    missingColumns = true;
    await saveStudioProfile({ fullName: "Ana" });
    const result = await syncNow();
    expect(result.status).toBe("partial");
    expect(result.error).toMatch(/migración del perfil/);
    expect(await database.meta.get(PROFILE_DIRTY)).toBeDefined();
  });

  it("al cerrar sesión conserva los datos y al volver no pierde nada", async () => {
    signIn();
    await saveStudioProfile({ fullName: "Ana", avatarDataUrl: PHOTO });
    await syncNow();
    auth.session = null;
    expect((await syncNow()).status).toBe("signed-out");
    expect((await getStudioProfile()).avatarDataUrl).toBe(PHOTO);
    signIn();
    expect((await syncNow()).status).toBe("ok");
    expect(await getStudioProfile()).toMatchObject({ fullName: "Ana", avatarDataUrl: PHOTO });
  });
});

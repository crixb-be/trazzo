# TRAZZO — RNE Pro Perú · Documento de Arquitectura

> Autor: arquitectura (Claude). Implementación: Codex. Este documento es la fuente de verdad del diseño.
> Idioma: UI y contenidos en **español (Perú)**; identificadores de código en inglés.

## 1. Producto

Plataforma **offline-first** para arquitectos, residentes de obra y estudiantes en Perú:

1. **Normativa** — fichas visuales del RNE (A.010, A.120, A.130, IS.010) con lámina SVG paramétrica, artículo, valor mínimo y "letra chica".
2. **Calculadoras** — escaleras (2cp+p), rampas (A.120), dotación de agua + cisterna/tanque (IS.010), pozos de luz (A.010).
3. **Metrados / cotizador** — proyectos → partidas → materiales con rendimiento, % desperdicio y precio referencial en PEN; export CSV/PDF.
4. **Asistente IA** — RAG estricto: solo responde con base en fragmentos del RNE recuperados; cita norma + artículo con enlace a la ficha.
5. **Cuenta** — planes `free` / `student` (50% dcto, verificación `.edu.pe` o documento) / `pro`; estado de sincronización offline.

### Principio rector: funciona sin backend

La app **debe compilar y ser usable sin variables de entorno**. Modo "local":

- Fichas y materiales salen del seed empaquetado (`src/data/seed-rne.ts`) → IndexedDB (Dexie).
- Proyectos/metrados se guardan en IndexedDB.
- Asistente usa recuperación local por palabras clave sobre el seed y responde de forma **extractiva** (sin LLM) si no hay API keys.
- Auth/pagos se muestran deshabilitados con aviso "Configura Supabase".
  Con Supabase configurado, se activa auth, sync remoto, RLS y RAG vectorial.

## 2. Stack (decisiones)

| Capa       | Elección                                                                                                                              | Motivo                                                                                                                                                                         |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Framework  | Next.js 15 App Router, React 19, TypeScript `strict`                                                                                  | Requerido                                                                                                                                                                      |
| Estilos    | Tailwind CSS + tokens CSS (dark/light vía clase `dark` en `<html>`)                                                                   | Requerido                                                                                                                                                                      |
| Iconos     | `lucide-react`                                                                                                                        | Requerido                                                                                                                                                                      |
| PWA        | **`@serwist/next`** (sucesor mantenido de `next-pwa`, compatible con App Router). Build con webpack (`next build`, sin `--turbopack`) | `next-pwa` está abandonado y falla con App Router                                                                                                                              |
| Offline DB | `dexie` + `dexie-react-hooks`                                                                                                         | Requerido                                                                                                                                                                      |
| Backend    | Supabase (`@supabase/supabase-js`, `@supabase/ssr`)                                                                                   | Requerido                                                                                                                                                                      |
| IA         | Vercel AI SDK v5 (`ai`, `@ai-sdk/react`, `@ai-sdk/google`, `@ai-sdk/openai`)                                                          | Requerido                                                                                                                                                                      |
| Embeddings | OpenAI `text-embedding-3-small` (1536 dims)                                                                                           | Requerido                                                                                                                                                                      |
| Validación | `zod`                                                                                                                                 | Entradas de API y formularios                                                                                                                                                  |
| PDF        | `jspdf` + `jspdf-autotable` (cliente, funciona offline)                                                                               | Export metrados                                                                                                                                                                |
| Tests      | `vitest`                                                                                                                              | Calculadoras y búsqueda                                                                                                                                                        |
| Móvil      | **Capacitor** (`@capacitor/core`, `@capacitor/cli`) en modo `server.url` → PWA desplegada                                             | La app usa API routes/SSR, no se puede exportar estático; Capacitor envuelve la URL. Plataformas (`npx cap add ios/android`) se agregan en la máquina con Xcode/Android Studio |

## 3. Diseño visual

Tokens (en `globals.css`, expuestos a Tailwind):

| Token               | Dark                  | Light                 |
| ------------------- | --------------------- | --------------------- |
| `--bg`              | `#121316`             | `#F6F5F2`             |
| `--surface`         | `#1C1E24`             | `#FFFFFF`             |
| `--surface-2`       | `#24272F`             | `#EFEDE8`             |
| `--border`          | `#2E313A`             | `#E2DFD8`             |
| `--text`            | `#E9E7E2`             | `#1A1B1F`             |
| `--muted`           | `#9A9CA5`             | `#6B6D75`             |
| `--accent`          | `#D4A359`             | `#B5822F`             |
| `--danger` / `--ok` | `#E26D5A` / `#6FBF8E` | `#C2410C` / `#15803D` |

- Fuentes: `Inter` (UI) + `JetBrains Mono` (cotas, artículos, códigos de norma) vía `next/font/google`.
- Estética de plano técnico: líneas finas 1px, grilla sutil de fondo en láminas, cotas con flechas y texto mono, sin sombras pesadas, radios 10–12px.
- Layout: sidebar fija en desktop; **bottom tab bar** en móvil (Inicio, Normativa, Calculadoras, Metrados, Asistente). Cuenta en header.
- Toggle dark/light persistido en `localStorage` (dark por defecto), sin flash (script inline en `<head>`).
- Badge de estado offline/online siempre visible en el header.

## 4. Estructura de carpetas

```text
/supabase/migrations/001_init.sql
/supabase/seed.sql                      # opcional, generado desde seed-rne.ts
/scripts/seed-supabase.ts               # upsert de rne_cards + materials_catalog
/scripts/embed-rne.ts                   # genera rne_embeddings (chunks por artículo)
/capacitor.config.ts
/src
  /app
    layout.tsx  manifest.ts  sw.ts  globals.css  ~offline/page.tsx
    /(auth)/login/page.tsx  /(auth)/register/page.tsx  /(auth)/layout.tsx
    /(dashboard)/layout.tsx           # shell: sidebar + bottom nav + header
    /(dashboard)/page.tsx             # Inicio
    /(dashboard)/normativa/page.tsx
    /(dashboard)/normativa/[slug]/page.tsx
    /(dashboard)/calculadoras/page.tsx
    /(dashboard)/metrados/page.tsx
    /(dashboard)/asistente/page.tsx
    /(dashboard)/cuenta/page.tsx
    /api/chat/route.ts
    /api/webhooks/payments/route.ts
    /auth/callback/route.ts
  /components
    /svg-diagrams/  DoorClearance.tsx WheelchairTurn.tsx RampSlope.tsx StairStep.tsx LightWell.tsx
                    DiagramFrame.tsx (grilla, escala, cotas) Dimension.tsx  index.ts (registry por svg_type)
    /ui/  Button Card Input Select Badge Tabs PaywallModal OfflineBadge ThemeToggle GlobalSearch ...
    /layout/ Sidebar BottomNav Header
  /lib
    /supabase/ client.ts server.ts middleware.ts admin.ts env.ts
    /offline/  db.ts (Dexie schema) sync.ts (seed→IDB, pull remoto, cola de cambios) hooks.ts
    /calculators/ stairs.ts ramps.ts water.ts lightwell.ts takeoff.ts  *.test.ts
    /search/  normalize.ts synonyms.ts search.ts  search.test.ts
    /rag/     retrieve.ts (vectorial + fallback local) prompt.ts
    /plans/   plans.ts (límites por plan, precios)
    /payments/ mercadopago.ts culqi.ts
  /data/seed-rne.ts
  middleware.ts
```

## 5. Base de datos (Supabase)

Migración única `001_init.sql`, idempotente donde sea razonable.

- `create extension if not exists vector;` y `pgcrypto`.
- Enums: `plan_type ('free','student','pro')`, `rne_category ('Accesibilidad','Circulación','Seguridad','Sanitarias','Estacionamientos')`, `project_status ('activo','pausado','cerrado')`.
- Tablas exactamente como el requerimiento, más columnas de soporte:
  - `rne_cards` + `edition text` (ej. "A.010 · DS 011-2006-VIVIENDA, mod. 2021"), `body text` (texto del artículo resumido), `params jsonb` (valores por defecto del SVG), `updated_at`.
  - `profiles` + `email`, `created_at`, `updated_at`.
  - `materials_catalog`: `code` único.
  - `project_takeoffs` + `created_at`; `subtotal_pen numeric(12,2)`.
- Índices: `rne_cards(slug)` único, GIN sobre `keywords`, índice `ivfflat`/`hnsw` sobre `rne_embeddings.embedding` (`vector_cosine_ops`).
- **Trigger** `handle_new_user` (security definer) → crea `profiles` al registrarse.
- **RLS** en todas las tablas:
  - `profiles`: select/update solo `auth.uid() = id`. Los usuarios **no** pueden cambiar `plan`, `student_verified`, `subscription_expires_at`, `ai_queries_used` → trigger `protect_profile_columns` que revierte esos campos si el rol no es `service_role`.
  - `rne_cards`: select público para `is_pro = false`; si `is_pro = true` solo para usuarios cuyo plan sea `student`/`pro` con `subscription_expires_at > now()` (función `has_pro_access()` security definer stable).
  - `rne_embeddings`, `materials_catalog`: select público; escritura solo service role.
  - `projects`: CRUD solo dueño. `project_takeoffs`: CRUD si el proyecto pertenece a `auth.uid()`.
- RPC `match_rne_documents(query_embedding vector(1536), match_threshold float, match_count int, filter_norm text default null)` → `id, norm_code, article, chunk_text, metadata, similarity` ordenado por similitud coseno.
- RPC `increment_ai_queries()` security definer → incrementa y devuelve el contador del usuario actual.
- Storage bucket privado `student-docs` con políticas: cada usuario sube/lee solo en `/{uid}/...`.

## 6. Offline (Dexie)

`TrazzoDB` v1, tablas: `rneCards (slug, norm_code, category, *keywords)`, `materials (code, category)`, `projects (id, updatedAt, syncState)`, `takeoffs (id, projectId, syncState)`, `meta (key)`, `outbox (++id, table, op, payload, createdAt)`.

- Al primer arranque: `ensureSeeded()` carga `seed-rne.ts` si `meta.seedVersion` < versión actual.
- Si Supabase está configurado y hay red: `pullRemote()` descarga `rne_cards` y `materials_catalog` (las fichas Pro solo si el plan lo permite) y actualiza `meta.lastSync`.
- Escrituras de proyectos/metrados: siempre en IDB primero (UUID v4 en cliente), y se encolan en `outbox`; `flushOutbox()` al volver la conexión (`online` event) si hay sesión.
- Service Worker (Serwist): precache del app shell + `defaultCache`; rutas de navegación con `NetworkFirst` y fallback `/~offline`; `/api/*` `NetworkOnly`.

## 7. Búsqueda tolerante (pura, testeada)

- `normalize(s)`: minúsculas, NFD sin diacríticos, sin puntuación, espacios colapsados. `"Alféizar"` → `"alfeizar"`.
- `synonyms.ts`: mapa jerga ↔ término técnico, ej.:
  `contrapaso, garganta, peldaño, paso → escalera` · `vano → puerta, ventana` · `alfeizar → ventana, antepecho` · `pozo de luz, ducto → iluminacion, ventilacion` · `falso piso → contrapiso, piso` · `rampa → accesibilidad, pendiente` · `discapacitado, silla de ruedas, conadis → accesibilidad` · `cochera, parqueo → estacionamiento` · `salida, evacuacion, escape → seguridad` · `agua, cisterna, tanque, dotacion → sanitarias`.
- `searchCards(cards, query)`: tokeniza, expande sinónimos, puntúa por campo (título ×4, keywords ×3, norm_code/article exacto ×5, summary ×1), coincidencia por prefijo y tolerancia a 1 error de tipeo para tokens ≥5 letras. Devuelve ordenado.

## 8. Reglas técnicas (calculadoras)

Funciones puras en `src/lib/calculators`, todas devuelven `{ ok: boolean, values, checks: {label, pass, ref}[], warnings }`, con `ref` = norma + artículo. **Unidades en metros.**

- **Escaleras (A.010)**: contrapaso `cp ≤ 0.18`, paso `p ≥ 0.25`, `0.60 ≤ 2cp + p ≤ 0.64`, máximo 17 contrapasos por tramo (si se excede, exigir descanso), ancho mínimo según uso (vivienda 0.90; evacuación según A.130 ≥ 1.20). Entrada: altura de piso a piso, paso deseado (opcional), ancho. Salida: número de contrapasos `n = ceil(H/0.18)`, `cp = H/n`, paso sugerido `p = clamp(0.63 − 2cp, ≥0.25)`, longitud de proyección horizontal `(n−1)·p` por tramo, tramos y descansos.
- **Rampas (A.120)**: pendiente máxima por desnivel: ≤0.25 m → 12%; 0.26–0.75 → 10%; 0.76–1.20 → 8%; 1.21–1.80 → 6%; 1.81–2.00 → 4%; >2.00 → 2%. Ancho libre mínimo 1.00 m. Descanso ≥ 1.50 m de largo entre tramos. Salida: longitud horizontal = desnivel / pendiente, cumplimiento de la pendiente propuesta, requerimiento de barandas.
- **Dotación de agua (IS.010)**: vivienda unifamiliar por área de lote (≤200 m² 1500 L/d; ≤300 1700; ≤400 1900; ≤500 2100; ≤600 2200; ≤700 2300; ≤800 2400; ≤900 2500; ≤1000 2600; >1000 +100 L/d por cada 100 m² adicionales). Multifamiliar por departamento según dormitorios (1: 500, 2: 850, 3: 1200, 4: 1350, 5: 1500 L/d). Oficinas 6 L/d por m² útil. Cisterna ≥ 3/4 de la dotación diaria; tanque elevado ≥ 1/3 y ≥ 1000 L. Mostrar resultado en L y m³.
- **Pozos de luz (A.010)**: ambientes habitables (dormitorios, estar, comedor, estudio): lado mínimo = max(2.20, H/3); servicios (cocina, baño, lavandería, pasajes): max(1.80, H/4). H = altura del paramento más bajo.
- **Metrados**: `quantity` = según unidad (m² = L×A; m³ = L×A×H; und/bls = cantidad directa o derivada por `yield_factor`); `total = quantity × yield_factor × (1 + waste_pct/100)`; `subtotal_pen = total × ref_price_pen`. Redondeo de bolsas/unidades hacia arriba.

> **Advertencia normativa obligatoria** en cada ficha y calculadora: "Valores referenciales según la edición indicada del RNE. Verifica la versión vigente publicada por el MVCS antes de usar en expedientes." Las fichas cuyo valor no esté 100% contrastado van con `verified_at = null` y la UI muestra "Por verificar".

## 9. Asistente IA (RAG estricto)

`POST /api/chat` (runtime nodejs, streaming con AI SDK `streamText` → `toUIMessageStreamResponse`).

1. Valida body con zod. Rate limit por plan: `free` 10 consultas/mes, `student` 200, `pro` ilimitado (si hay sesión; sin sesión 5 por IP en memoria).
2. Recuperación: si `OPENAI_API_KEY` + Supabase → embedding de la pregunta → `match_rne_documents(threshold 0.75, count 6)`. Si no → `retrieveLocal()` con `searchCards` sobre el seed.
3. Si no hay fragmentos sobre el umbral → responde de forma fija: "No encontré esto en las normas indexadas del RNE…" (sin llamar al LLM).
4. Prompt de sistema: responder **solo** con el contexto; cada afirmación cita `[A.120 Art. 9]`; si el contexto no alcanza, decirlo; no inventar valores; español peruano técnico; recordar verificar la versión vigente.
5. Modelo: `gemini-2.0-flash` si `GOOGLE_GENERATIVE_AI_API_KEY`, si no `gpt-4o-mini` con `OPENAI_API_KEY`; si no hay ninguno → respuesta extractiva armada con los fragmentos (texto normal, mismo formato de citas).
6. Las fuentes se envían al cliente (parte `data`/metadata) y el cliente convierte `[A.120 Art. 9]` en enlaces a `/normativa/[slug]`.

## 10. Planes y pagos

`src/lib/plans/plans.ts`: `free` (fichas básicas, 3 calculadoras, 1 proyecto, 10 consultas IA/mes), `student` (S/ 9.95/mes, 50% de Pro, requiere verificación), `pro` (S/ 19.90/mes: fichas Pro, proyectos ilimitados, export PDF, IA ilimitada). Montos configurables.

`POST /api/webhooks/payments?provider=mercadopago|culqi`:

- Mercado Pago: valida `x-signature` (`ts=…,v1=…`) con HMAC-SHA256 de `id:{data.id};request-id:{x-request-id};ts:{ts};` usando `MP_WEBHOOK_SECRET`; consulta el pago con `MP_ACCESS_TOKEN`; si `approved` → actualiza `profiles` vía cliente service role (`plan`, `subscription_expires_at = now + 30 días`). `external_reference` = `userId:plan`.
- Culqi: valida firma con `CULQI_WEBHOOK_SECRET`, evento `charge.creation.succeeded`, `metadata.user_id` + `metadata.plan`.
- Plan `student` solo se aplica si `student_verified = true`; si no, se registra y queda pendiente.
- Idempotencia: tabla `payment_events (id text pk, provider, payload jsonb, processed_at)` (incluirla en la migración).
- Responde 200 rápido; errores de firma → 401.

## 11. Variables de entorno (`.env.example`)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=
MP_ACCESS_TOKEN=
MP_WEBHOOK_SECRET=
CULQI_WEBHOOK_SECRET=
NEXT_PUBLIC_APP_URL=http://localhost:3000
CAPACITOR_SERVER_URL=
```

## 12. Definición de "terminado"

- `npm run build` sin errores **sin** `.env` (modo local).
- `npm run typecheck` (tsc --noEmit) y `npm run lint` limpios.
- `npm test` (vitest) pasa: escaleras, rampas, dotación, pozos de luz, metrados, normalize/search.
- Todas las rutas renderizan; la app funciona desconectada tras la primera carga.
- `README.md` en español: setup, Supabase (migración + seed + embeddings), variables, PWA, Capacitor (iOS/Android), pagos.

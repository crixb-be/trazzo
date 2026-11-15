# TRAZZO · RNE Pro Perú

TRAZZO es una herramienta técnica offline-first para arquitectura y obra en Perú. Reúne fichas navegables del Reglamento Nacional de Edificaciones, calculadoras paramétricas, metrados por proyecto y un asistente RAG con citas verificables.

## Funciones

- Catálogo local de fichas RNE con búsqueda por norma, artículo, términos técnicos y jerga de obra peruana.
- Calculadoras de escaleras, rampas, dotación de agua, pozos de luz y evacuación.
- Diagramas SVG paramétricos que muestran cotas, reglas y referencias normativas.
- Proyectos y partidas de metrados guardados primero en IndexedDB, con cola de sincronización.
- Asistente con recuperación local y pgvector cuando Supabase y OpenAI están configurados.
- Planes Gratis, Estudiante y PRO, con cuotas de IA y exportación PDF protegida.
- PWA instalable y experiencia usable sin conexión.

## Capturas

Las siguientes ubicaciones están reservadas para capturas del producto:

- docs/screenshots/inicio.png
- docs/screenshots/normativa.png
- docs/screenshots/calculadoras.png
- docs/screenshots/metrados.png

## Modo local

Sin variables de entorno, TRAZZO funciona en modo local:

- El seed de fichas y materiales se carga en Dexie al abrir la aplicación.
- El asistente recupera fichas locales y devuelve una respuesta extractiva con citas.
- Las cuentas, sincronización remota y pagos permanecen desactivados.
- No se envían preguntas ni datos de proyectos a un servicio externo.

## Desarrollo

Requisitos: Node.js 26 y npm 11.

    npm install
    npm run dev

Comandos de calidad:

    npm run format
    npm run format:check
    npm run typecheck
    npm run lint
    npm test
    npm run build
    npm run start

## Variables de entorno

| Variable                      | Uso                                     | Requerida        |
| ----------------------------- | --------------------------------------- | ---------------- |
| NEXT_PUBLIC_SUPABASE_URL      | URL del proyecto Supabase               | Cuentas/sync     |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Clave pública Supabase                  | Cuentas/sync     |
| SUPABASE_SERVICE_ROLE_KEY     | Webhooks, seed y administración         | Backend Supabase |
| ANTHROPIC_API_KEY             | Modelo Claude para el asistente         | RAG generativo   |
| OPENAI_API_KEY                | Embeddings pgvector y modelo GPT        | RAG vectorial    |
| GEMINI_API_KEY                | Gemini 2.5 Flash para el asistente      | RAG generativo   |
| GOOGLE_GENERATIVE_AI_API_KEY  | Alias anterior de GEMINI_API_KEY        | RAG generativo   |
| AI_PROVIDER                   | Fuerza anthropic, openai o google       | Opcional         |
| MP_ACCESS_TOKEN               | Preferencias y consulta de Mercado Pago | Pagos            |
| MP_WEBHOOK_SECRET             | Firma de webhooks Mercado Pago          | Pagos            |
| CULQI_WEBHOOK_SECRET          | Firma de webhooks Culqi                 | Pagos            |
| NEXT_PUBLIC_APP_URL           | URL pública para retornos de pago       | Producción       |
| CAPACITOR_SERVER_URL          | URL remota para la app Capacitor        | Mobile           |

Copia las variables a .env.local. El repositorio no incluye secretos ni un archivo .env.

## Asistente RNE

El asistente traduce primero el lenguaje cotidiano a términos del RNE ("baño de servicios" → servicios higiénicos, aparato sanitario; "medida" → ancho mínimo, altura libre, vano) y recupera hasta 6 fichas relacionadas. Con una clave de IA redacta una respuesta completa con respaldo técnico y citas que enlazan a cada ficha; sin clave responde en modo local con las fichas más relevantes.

Proveedor: se usa `AI_PROVIDER` si su clave está configurada; si no, el primero disponible entre Google (Gemini 2.5 Flash con `GEMINI_API_KEY`), Anthropic (Claude Opus 5.5) y OpenAI (gpt-4o-mini). OpenAI va al final porque su clave suele usarse solo para embeddings. Antes de enviar las fichas al modelo se descartan las de otros elementos (por ejemplo, un pozo de luz cuando la pregunta es sobre una puerta), y cualquier error del proveedor se registra en la consola del servidor. Con Claude se activan los fallbacks del lado del servidor: si el modelo declina una consulta, la API la reintenta con un modelo alternativo en la misma solicitud.

## Supabase

1. Crea un proyecto Supabase y configura las variables anteriores.
2. Ejecuta supabase/migrations/001_init.sql desde el SQL Editor o con la CLI.
3. Carga el seed:

   npm run seed:supabase

4. Genera embeddings RNE con OPENAI_API_KEY:

   npm run embed:rne

Los scripts `seed:supabase` y `embed:rne` leen `.env.local` automáticamente; si el archivo no existe, avisan y omiten la carga sin fallar.

La migración activa vector, pgcrypto, RLS, políticas de Storage y el RPC match_rne_documents. Las políticas de perfil protegen los campos de plan, verificación, vencimiento y cuota de IA.

## PWA y modo offline

El service worker se genera con la configuración de Serwist. El seed local se identifica con SEED_VERSION; si cambia, Dexie actualiza fichas y materiales. Los cambios de proyectos y partidas se escriben primero en IndexedDB y se encolan para sincronización cuando vuelve la conexión.

Para generar iconos PNG:

    npm run icons

Se generan iconos de 192 y 512 px, variantes maskable y apple-touch-icon.png dentro de public/icons.

## Capacitor para iOS y Android

Construye la aplicación web, configura la URL de despliegue y sincroniza las plataformas:

    npm run build
    $env:CAPACITOR_SERVER_URL="https://tu-dominio.example"
    npx cap add ios
    npx cap add android
    npx cap sync
    npx cap open ios
    npx cap open android

Abre iOS con Xcode y Android con Android Studio. En producción, sirve la aplicación en HTTPS y valida la política de almacenamiento local de cada plataforma.

## Pagos

Configura Mercado Pago y registra:

- https://tu-dominio.example/api/webhooks/payments?provider=mercadopago
- https://tu-dominio.example/api/webhooks/payments?provider=culqi

El checkout crea una preferencia con external_reference en formato userId:plan. El webhook valida la firma, evita duplicados mediante payment_events y activa treinta días. El plan Estudiante se activa solo después de verificar la condición estudiantil.

## Aviso normativo

TRAZZO es una herramienta de consulta y predimensionamiento. Sus valores son referenciales y corresponden a la edición indicada en cada ficha. Verifica siempre la versión vigente publicada por el MVCS y el criterio de la autoridad competente antes de usar un resultado en un expediente, licencia, obra o decisión de seguridad.

## Estructura

- src/app: layouts, páginas, autenticación y rutas API.
- src/components/layout: shell de escritorio y navegación móvil.
- src/components/normativa: catálogo y detalle de fichas.
- src/components/calculators: formularios, resultados y diagramas de cálculo.
- src/components/metrados: proyectos, partidas, exportaciones y sincronización.
- src/components/assistant: conversación, citas y sugerencias.
- src/components/svg-diagrams: SVG técnicos paramétricos.
- src/lib: calculadoras, búsqueda, Dexie, RAG, planes, pagos y Supabase.
- src/data/seed-rne.ts: seed versionado de fichas y materiales.
- supabase/migrations: esquema, RLS, Storage y RPC.
- public: manifest, service worker e iconos.

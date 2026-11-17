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
| GEMINI_API_KEY                | Gemini 3.8 Flash para el asistente      | RAG generativo   |
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

Proveedor: se usa `AI_PROVIDER` si su clave está configurada; si no, el primero disponible entre Google (Gemini 3.8 Flash con `GEMINI_API_KEY`), Anthropic (Claude Opus 5.5) y OpenAI (gpt-4o-mini). OpenAI va al final porque su clave suele usarse solo para embeddings. Antes de enviar las fichas al modelo se descartan las de otros elementos (por ejemplo, un pozo de luz cuando la pregunta es sobre una puerta), y cualquier error del proveedor se registra en la consola del servidor. Con Claude se activan los fallbacks del lado del servidor: si el modelo declina una consulta, la API la reintenta con un modelo alternativo en la misma solicitud.

## Supabase

1. Crea un proyecto Supabase y configura las variables anteriores.
2. Ejecuta en orden todas las migraciones de supabase/migrations (001 a 005) desde el SQL Editor o con la CLI. La 004 crea el espacio de fotos de perfil y la 005 el cupo diario del asistente.
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

## App nativa con Capacitor (iOS y Android)

TRAZZO necesita su servidor (asistente, pagos, cuenta), así que la app nativa es un contenedor que carga el sitio desplegado. `capacitor.config.ts` toma la dirección de `CAPACITOR_SERVER_URL` y `capacitor/www` contiene solo dos páginas propias: un aviso de configuración y la pantalla «sin conexión» del primer arranque. Después de la primera carga, el service worker hace que la app abra sin señal igual que en el navegador.

Requisitos en tu computadora (no están en el repositorio): Android Studio para Android; una Mac con Xcode para iOS.

    npm install @capacitor/android @capacitor/ios
    export CAPACITOR_SERVER_URL="https://tu-dominio.example"   # PowerShell: $env:CAPACITOR_SERVER_URL="..."
    npx cap add android
    npx cap add ios
    npx cap sync
    npx cap open android
    npx cap open ios

Reglas de la dirección: debe ser `https`. Solo se acepta `http` para `localhost`, `127.0.0.1` o `10.0.2.2` (emulador de Android) durante el desarrollo. Cada vez que cambies la dirección o actualices un plugin, ejecuta `npx cap sync`.

### Cámara

«Tomar foto» en Proyectos usa `@capacitor/camera` dentro de la app nativa y el selector de cámara del teléfono en el navegador. Las fotos se reducen a 1280 px y se guardan en el dispositivo (hasta 30 por proyecto); viajan en la copia de seguridad.

Permisos que debes declarar después de `cap add`:

- iOS, en `ios/App/App/Info.plist`: `NSCameraUsageDescription` («TRAZZO usa la cámara para registrar fotos de obra en tus proyectos») y `NSPhotoLibraryUsageDescription` / `NSPhotoLibraryAddUsageDescription` si permites elegir de la galería.
- Android: el plugin no exige permisos adicionales para tomar fotos con la cámara del sistema. Si tu `AndroidManifest.xml` declara `android.permission.CAMERA`, Android obliga a pedirlo en tiempo de ejecución.

### Antes de publicar en las tiendas

- **Identidad:** `appId` es `pe.trazzo.app`. Confírmalo antes del primer envío: no se puede cambiar después.
- **Íconos y pantalla de inicio:** genera los recursos nativos con `npx @capacitor/assets generate` a partir de un ícono de 1024 px y una imagen de inicio. Los de `public/icons` son para la web.
- **Versión:** sube `versionCode` / `versionName` (Android) y `CFBundleVersion` / `CFBundleShortVersionString` (iOS) en cada envío.
- **Pagos:** en web/PWA se muestran Mercado Pago y Culqi según su configuración. Dentro de Capacitor se ocultan los checkouts externos: el plan se sincroniza automáticamente al iniciar sesión y se muestra Free/Pro. Apple y Google exigen su propio sistema de compras para suscripciones digitales dentro de la app; esta versión aplica la estrategia «Web Checkout + App Nativa sincronizada».
- **App Store, contenido mínimo:** Apple rechaza apps que son solo un sitio web empaquetado. Ayuda destacar lo que funciona sin conexión y la cámara; aun así, el resultado de la revisión no está garantizado.
- **Privacidad:** publica una política de privacidad con URL pública y declara los datos que se recogen (correo de la cuenta, datos de proyectos sincronizados, documento de verificación de estudiante). Ambas tiendas piden también una forma de eliminar la cuenta.
- **Pruebas en dispositivo:** instala en un teléfono real y comprueba inicio de sesión, modo sin conexión tras la primera carga, cámara, compartir imagen/PDF y la copia de seguridad.

Estado: la configuración se validó con `npx cap add android` y `npx cap sync` (copian `capacitor/www` y registran el plugin de cámara). No se compiló ni se probó ninguna app nativa: eso requiere Android Studio o Xcode.

## Pagos

Configura Mercado Pago/Culqi y registra:

- https://tu-dominio.example/api/webhooks/payments?provider=mercadopago
- https://tu-dominio.example/api/webhooks/payments?provider=culqi

El checkout crea una preferencia con `external_reference` en formato `userId:plan:cycle`. Si faltan variables, la interfaz indica «Pasarela en modo demo / sin configurar» sin romper la app. El webhook valida la firma, reclama el evento de forma atómica mediante `payment_events` antes de aplicar el plan y borra la reclamación si falla la actualización, para que el proveedor reintente. El plan Estudiante se activa solo después de verificar la condición estudiantil.

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

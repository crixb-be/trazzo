# PLAN MAESTRO — TRAZZO

> Auditoría y hoja de ruta para convertir TRAZZO en la herramienta de bolsillo de arquitectura y obra (Perú / LatAm).
> Fecha de la auditoría: 2026-11-15 · Rama: `claude/wonderful-noether-6eoymr` · Último commit de código revisado: `35f7176`.
> **Estado: plan aprobado por el usuario el 2026-11-15. En ejecución; el avance real está en la sección 9.**

## Cómo usar este documento

1. Lee el **Resumen ejecutivo** (sección 1) y las **Decisiones que necesito de ti** (sección 7).
2. Responde "Aprobado, empieza" (con tus respuestas a la sección 7 si quieres cambiar algo).
3. La ejecución sigue la **Hoja de ruta** (sección 6), bloque por bloque, con un commit por bloque.
4. El avance real siempre está al final, en **ESTADO DE AVANCE Y HANDOFF** (sección 9). Otra sesión u otra IA puede continuar leyendo solo esa sección y el bloque que toque.

Cada hallazgo tiene un código (`T-xx` técnico, `U-xx` de diseño, `C-xx` de contenido) que la hoja de ruta referencia.

---

## 1. Resumen ejecutivo

TRAZZO tiene una base sólida: Next.js 15 + React 19 con TypeScript estricto, datos locales en IndexedDB, calculadoras como funciones puras con 156 pruebas que pasan, láminas SVG paramétricas, búsqueda tolerante a jerga de obra y un módulo de honorarios con PDF. El build, el typecheck y el lint pasan sin variables de entorno.

Lo que hoy impide que sea "indispensable en obra":

1. **Promete cosas que no cumple en silencio.** La sincronización de proyectos y metrados con la nube no funciona y aun así muestra "Sincronización completada" (T-01). Un usuario Pro sin señal vuelve a ser tratado como Gratis (T-02). Un usuario que paga sigue limitado a 1 proyecto (T-03).
2. **El modo sin conexión es parcial.** Solo abren sin señal las páginas que ya se cargaron completas antes; una ficha, Cuenta o el Asistente nunca visitados dan error del navegador (T-04).
3. **El contenido es corto y no está verificado.** Son 17 fichas de 4 normas, todas marcadas "Por verificar", y 25 materiales con precios sin fuente (C-01, C-02).
4. **En celular cuesta llegar al dato.** El resultado de una calculadora queda fuera de la primera pantalla, el inicio gasta la primera pantalla en un titular, y entre el 30 % y el 80 % de los botones miden menos de 40 px (U-01 a U-05).
5. **Faltan las herramientas que uno saca del bolsillo en obra:** medidas antropométricas y de mobiliario, cálculo de materiales (concreto, ladrillo, tarrajeo, pintura, acero), conversor de unidades, pendientes, áreas y cabida de terreno.

La hoja de ruta propone 3 fases: **Fase 1** corrige lo roto y la base móvil (8 bloques), **Fase 2** añade las herramientas de alto valor (10 bloques) y **Fase 3** pule el diseño y los detalles profesionales (7 bloques).

### Límites de esta auditoría

- Los hallazgos de sincronización y pagos salen de leer el código: no hay Supabase ni Mercado Pago configurados en este entorno, así que no los ejecuté contra servicios reales. T-01 es de confianza alta (las columnas no coinciden con la tabla); T-06 es probable, no confirmado.
- Las mediciones móviles son en Chromium emulando un Pixel 7 (412 px), no en un teléfono físico.
- No contrasté los valores normativos con el texto oficial del RNE; por eso C-01 es una tarea, no un veredicto.
- El benchmark (sección 5) se basa en mi conocimiento de esos productos, no en una investigación en vivo.

---

## 2. Radiografía actual

| Aspecto      | Estado                                                                                                                                                            |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stack        | Next.js 15 (App Router), React 19, TypeScript estricto, Tailwind 4 + `globals.css`, Dexie (IndexedDB), Supabase opcional, Serwist (PWA), jsPDF, AI SDK, Capacitor |
| Rutas        | `/` inicio, `/normativa` y `/normativa/[slug]`, `/calculadoras`, `/metrados`, `/honorarios`, `/asistente`, `/cuenta`, `/login`, `/register`                       |
| Calculadoras | Escaleras, rampas, dotación de agua, pozos de luz, evacuación                                                                                                     |
| Contenido    | 17 fichas (A.010, A.120, A.130, IS.010), 25 materiales                                                                                                            |
| Pruebas      | 24 archivos, 156 pruebas unitarias (Vitest). No hay pruebas de interfaz ni de extremo a extremo                                                                   |
| CI           | No existe (`.github/` no está en el repo)                                                                                                                         |
| Tamaño       | 14 400 líneas de TS/TSX; `globals.css` tiene 3 454 líneas en un solo archivo                                                                                      |

### Peso de cada página (build de producción)

| Ruta                        | JS de primera carga |
| --------------------------- | ------------------- |
| `/`, `/normativa`, `/login` | 224–225 kB          |
| `/calculadoras`             | 234 kB              |
| `/asistente`                | 278 kB              |
| `/metrados`                 | 366 kB              |
| `/honorarios`               | 376 kB              |

### Mediciones en móvil (Pixel 7 emulado)

| Pantalla     | Alto (pantallas) | Controles < 40 px | Campos con letra < 16 px | Textos < 12 px |
| ------------ | ---------------- | ----------------- | ------------------------ | -------------- |
| Inicio       | 2.4              | 14 de 32          | 1 de 1                   | 16 de 62       |
| Normativa    | 5.5              | 33 de 40          | 2 de 2                   | 46 de 157      |
| Ficha        | 1.9              | 23 de 33          | —                        | 22 de 46       |
| Calculadoras | 2.2              | 10 de 25          | 0 de 4                   | 21 de 45       |
| Honorarios   | 5.6              | 31 de 87          | 3 de 48                  | 27 de 85       |
| Asistente    | 1.7              | 4 de 18           | 0 de 1                   | 12 de 29       |
| Cuenta       | 4.1              | 12 de 36          | 2 de 9                   | 18 de 61       |

---

## 3. Auditoría técnica

Severidad: **Crítico** = pérdida de datos, cobro o función pagada rota · **Alto** = flujo roto o engañoso · **Medio** = fricción o riesgo · **Bajo** = deuda o detalle.

### Críticos

| ID   | Hallazgo                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Evidencia                                                                                                                                                        | Corrección                                                                                                                                                                              |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T-01 | **La sincronización de proyectos y metrados no funciona y lo oculta.** Se envía el objeto local tal cual (`updatedAt`, `syncState`, `projectId`, sin `user_id`) a tablas con columnas `updated_at`, `project_id` y `user_id` obligatorio. El error no se revisa, la función devuelve `true` y el cambio se borra de la cola. La pantalla dice "Sincronización completada". Tampoco se descargan proyectos ni cotizaciones de la nube, aunque el comentario lo afirma. | `src/lib/offline/sync.ts:32-54` y `:108`; tabla en `supabase/migrations/001_init.sql:107-135`                                                                    | Mapear campos, añadir `user_id`, revisar `error`, conservar en cola lo que falle, marcar `syncState: "synced"`, descargar proyectos, partidas y cotizaciones, y mostrar el estado real. |
| T-02 | **Un usuario Pro sin señal pierde su plan.** El plan se pide a la red en cada pantalla y nunca se guarda; si la consulta falla, queda "Gratis": sin PDF de metrados, sin fichas Pro y con marca de agua. Además la misma consulta está copiada en 6 archivos.                                                                                                                                                                                                         | `src/lib/plans/use-current-plan.ts:26-38`, `MetradosWorkspace.tsx:61-74`, `NormativaCatalog.tsx`, `NormativeDetail.tsx`, `AccountWorkspace.tsx`, `sync.ts:19-30` | Un solo `usePlan` que guarda el plan y su vencimiento en IndexedDB y lo usa sin conexión.                                                                                               |
| T-03 | **Los usuarios de pago siguen limitados a 1 proyecto.** El límite está fijo en el código y no mira el plan. `canCreateProject()` existe pero no se usa.                                                                                                                                                                                                                                                                                                               | `src/components/metrados/MetradosWorkspace.tsx:100`                                                                                                              | Usar `canCreateProject(plan, n)`.                                                                                                                                                       |
| T-04 | **Sin conexión solo abren las páginas ya cargadas.** Probado: tras visitar Inicio y Calculadoras, sin red abren esas dos y la navegación por la barra inferior; una ficha, `/cuenta` y `/asistente` dan error del navegador. La página `/~offline` existe pero el service worker no la usa.                                                                                                                                                                           | `src/app/sw.ts` (sin precarga de rutas ni `fallbacks`)                                                                                                           | Precargar todas las rutas (son estáticas) y configurar el respaldo `/~offline`.                                                                                                         |
| T-05 | **La suscripción nunca vence en la app.** El pago guarda `subscription_expires_at`, pero ni la app ni `/api/chat` lo leen: con un pago el plan queda para siempre.                                                                                                                                                                                                                                                                                                    | Único uso: `src/app/api/webhooks/payments/route.ts:42`                                                                                                           | Tratar el plan como "Gratis" si la fecha pasó (cliente y servidor).                                                                                                                     |
| T-06 | **Un pago que primero llega "pendiente" puede no activarse nunca** (probable). La idempotencia usa solo el id del pago; el aviso posterior "aprobado" del mismo pago se descarta como repetido. Además el evento se registra antes de aplicar el plan: si la actualización falla, no se reintenta.                                                                                                                                                                    | `src/app/api/webhooks/payments/route.ts:126-145`                                                                                                                 | Idempotencia por id + estado, y registrar el evento después de aplicar el plan.                                                                                                         |

### Altos

| ID   | Hallazgo                                                                                                                                                                                                                                                                                                                                   | Evidencia                                                                                           | Corrección                                                                                    |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| T-07 | **El PDF de metrados sale con columnas corridas.** El encabezado tiene 7 columnas y cada fila 8 valores: bajo "Total" aparece el precio unitario y el subtotal queda sin título.                                                                                                                                                           | `MetradosWorkspace.tsx:259-275`                                                                     | Añadir la columna "P. unit." al encabezado y al pie.                                          |
| T-08 | **La verificación de estudiante con correo `.edu.pe` no hace nada.** Muestra "Solicitud enviada. Revisa tu correo" sin enviar ni registrar nada.                                                                                                                                                                                           | `AccountWorkspace.tsx:307-310`                                                                      | Registrar la solicitud y enviar el enlace, o cambiar el texto mientras no exista.             |
| T-09 | **Las reglas de pago se contradicen según la pantalla.** Sin cuenta, Honorarios exporta PDF limpio y Metrados lo bloquea. La calculadora de Evacuación lleva etiqueta "PRO" pero está abierta. El bloqueo de fichas Pro es solo una capa visual: el texto está en la página (la regla CSS de desenfoque apunta a una clase que no existe). | `FeeQuoteWorkspace.tsx`, `MetradosWorkspace.tsx:240`, `CalculatorWorkspace.tsx`, `globals.css:1055` | Definir una sola tabla de qué incluye cada plan (ver sección 7) y aplicarla desde `plans.ts`. |
| T-10 | **Las fichas de dotación de agua muestran la lámina de pozo de luz** ("POZO DE LUZ / H · A.010").                                                                                                                                                                                                                                          | `src/data/seed-rne.ts:435` y `:465` (`svg_type: "light-well"`)                                      | Crear una lámina de cisterna y tanque y asignarla.                                            |
| T-11 | **El asistente no funciona sin señal aunque podría.** La respuesta local por fichas no necesita servidor, pero el campo se desactiva sin conexión.                                                                                                                                                                                         | `AssistantWorkspace.tsx:83`                                                                         | Responder en el dispositivo cuando no hay red.                                                |
| T-12 | **El cupo del asistente es poco fiable.** El límite de visitantes vive en memoria del servidor y se reinicia con cada despliegue o instancia; al usuario con cuenta se le descuenta la consulta antes de saber si hubo respuesta.                                                                                                          | `src/app/api/chat/route.ts:54` y `:204`                                                             | Guardar el cupo en base de datos y descontar al responder.                                    |

### Medios y bajos

| ID   | Sev.  | Hallazgo                                                                                                                                                                                                 | Evidencia                                                      |
| ---- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| T-13 | Medio | jsPDF se carga al abrir Metrados y Honorarios aunque no se exporte: +140 kB en cada una.                                                                                                                 | `MetradosWorkspace.tsx:4`, `src/lib/pdf/export-proposal.ts:1`  |
| T-14 | Medio | El precio del acero parece estar por kilo y no por varilla: S/ 4.80 igual para 3/8", 1/2" y 5/8".                                                                                                        | `src/data/seed-rne.ts` (`acero-3-8`, `acero-1-2`, `acero-5-8`) |
| T-15 | Medio | El buscador "global" solo busca fichas del catálogo empaquetado: no encuentra calculadoras, proyectos ni cotizaciones, ni fichas descargadas de la nube. Hay dos buscadores con el mismo `id` en Inicio. | `GlobalSearch.tsx:32` y `:107`                                 |
| T-16 | Medio | En Normativa, cada tecla cambia la URL con una navegación.                                                                                                                                               | `NormativaCatalog.tsx:72`                                      |
| T-17 | Medio | Cada cambio de red escribe una fila nueva en la base local y nunca se borran.                                                                                                                            | `src/lib/offline/hooks.ts:73`                                  |
| T-18 | Medio | "Restablecer datos" borra la base y deja la app abierta sin recargar; lo siguiente que se toque falla.                                                                                                   | `AccountWorkspace.tsx:338`                                     |
| T-19 | Medio | El build ignora el lint y no hay CI: nada impide subir código roto.                                                                                                                                      | `next.config.mjs:10`                                           |
| T-20 | Bajo  | Textos con caracteres dañados: "TRAZZO PRO ? Mensual" en el checkout y "¿Eliminar COT-…—" al borrar una cotización.                                                                                      | `checkout/route.ts:59`, `FeeQuoteWorkspace.tsx:201`            |
| T-21 | Bajo  | En la ficha, todos los parámetros de la lámina muestran "m", incluso el número de contrapasos, y usan nombres internos (`cp`, `risers`).                                                                 | `NormativeDetail.tsx:86-88`                                    |
| T-22 | Bajo  | "Preguntar al asistente" recarga toda la página en vez de navegar dentro de la app.                                                                                                                      | `NormativeDetail.tsx:156`                                      |
| T-23 | Bajo  | "Cancelar edición" en una partida deja los datos en el formulario; al guardar se crea un duplicado.                                                                                                      | `TakeoffTable.tsx:70`                                          |
| T-24 | Bajo  | El service worker se registra dos veces (a mano y por Serwist).                                                                                                                                          | `src/app/layout.tsx:38-44`, `next.config.mjs`                  |
| T-25 | Bajo  | `capacitor.config.ts` apunta a `.next`, que no es un sitio estático; solo sirve con `CAPACITOR_SERVER_URL`.                                                                                              | `capacitor.config.ts:6`                                        |
| T-26 | Bajo  | `globals.css`: 3 454 líneas, 25 selectores definidos dos o tres veces. 59 archivos empiezan con el carácter invisible BOM.                                                                               | `src/app/globals.css`                                          |
| T-27 | Bajo  | El historial del asistente se pierde al cambiar de pantalla.                                                                                                                                             | `AssistantWorkspace.tsx`                                       |

---

## 4. Auditoría de diseño y experiencia

| ID   | Hallazgo                                                                                                                                                                                                     | Evidencia                                                                    | Propuesta                                                                           |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| U-01 | **El resultado de la calculadora queda fuera de la primera pantalla.** Antes hay título, párrafo, pestañas, aviso legal y campos; "17 contrapasos" aparece tras deslizar más de una pantalla.                | `/calculadoras` mide 2.2 pantallas                                           | Cabecera compacta, aviso legal al pie y resultado fijo visible mientras se escribe. |
| U-02 | **El inicio gasta la primera pantalla en un titular.** "Criterio técnico, en cada cota" y dos botones ocupan todo; las herramientas empiezan debajo.                                                         | Captura de `/`                                                               | Inicio como tablero: buscador, cuadrícula de herramientas, recientes y favoritos.   |
| U-03 | **Controles pequeños para una mano con guantes o polvo.** Botones de 34 px, íconos de 30–34 px, acciones de fila de 24 px, casillas de 13 px.                                                                | Tabla de la sección 2                                                        | Mínimo 44 px en todo control táctil.                                                |
| U-04 | **Letra muy pequeña.** Etiquetas de la barra inferior a 9 px; 55 reglas CSS con letra de 9–11 px.                                                                                                            | `globals.css:1460`                                                           | Mínimo 12 px; barra inferior a 11 px.                                               |
| U-05 | **Seis pestañas en la barra inferior.** A 360 px "Honorarios" apenas cabe, y Cuenta queda solo como ícono de 30 px arriba.                                                                                   | `BottomNav.tsx`                                                              | Cinco destinos (ver sección 7, decisión 1).                                         |
| U-06 | **La ficha muestra primero la lámina y después el dato.** El valor mínimo y el título quedan bajo la primera pantalla.                                                                                       | Captura de la ficha                                                          | Título y valor arriba; lámina debajo.                                               |
| U-07 | **Las pestañas de calculadoras se cortan.** "Pozos de l…" queda a medias y "Evacuación" no se ve; nada indica que hay más.                                                                                   | Captura de `/calculadoras`                                                   | Cuadrícula de herramientas o selector visible completo.                             |
| U-08 | **Jerga interna a la vista del usuario:** "Supabase activo", "Configura Supabase", "RAG estricto", "ONLINE / LOCAL", "Sin API keys… recupera el seed", "Seed v4".                                            | `AccountWorkspace.tsx`, `AssistantWorkspace.tsx:42` y `:121`, `AuthCard.tsx` | Lenguaje de usuario: "Guardado en este teléfono", "Asistente RNE".                  |
| U-09 | **El formulario de partida muestra siempre Largo, Ancho, Alto y Cantidad**, aunque el material solo use algunos, y la tabla tiene 11 columnas en celular.                                                    | `TakeoffTable.tsx`                                                           | Mostrar solo los campos de la unidad elegida; lista de tarjetas en móvil.           |
| U-10 | **Honorarios es un formulario de 5.6 pantallas con 48 campos.**                                                                                                                                              | `QuoteForm.tsx` (1 007 líneas, 7 secciones)                                  | Asistente por pasos con total fijo abajo.                                           |
| U-11 | **Confirmaciones con ventanas del navegador** (`window.confirm`) y avisos como texto al final de la página, fuera de la vista.                                                                               | 3 archivos; `account-notice`                                                 | Diálogo propio y avisos flotantes.                                                  |
| U-12 | **Accesibilidad:** el foco de los campos no tiene contorno (`outline: 0`), no hay estilos `:focus-visible` ni respeto a "reducir movimiento"; se usa `100vh`, que en móvil salta con la barra del navegador. | `globals.css:324`, `:57`                                                     | Foco visible, `100dvh`, `prefers-reduced-motion`.                                   |
| U-13 | **Las sugerencias del asistente solo rellenan el campo**; hay que tocar enviar otra vez.                                                                                                                     | `AssistantWorkspace.tsx:36`                                                  | Enviar al tocar.                                                                    |
| U-14 | **No hay recientes ni favoritos reales.** "Fichas recientes" son siempre las 4 primeras del catálogo.                                                                                                        | `HomeDashboard.tsx:48`                                                       | Guardar historial y favoritos locales.                                              |
| U-15 | **Usuario nuevo sin guía:** no hay bienvenida ni explicación de que funciona sin cuenta, ni ayuda para instalar la app en iPhone.                                                                            | —                                                                            | Bienvenida de 3 pasos e instrucciones de instalación.                               |

### Contenido

| ID   | Hallazgo                                                                                                                                              | Propuesta                                                                                                         |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| C-01 | Las 17 fichas tienen `verified_at: null`: todas salen "Por verificar". Las referencias son genéricas ("Cap. VI - Escaleras"), sin número de artículo. | Verificar contra el texto vigente y citar artículo y resolución. Necesita fuente oficial (sección 7, decisión 3). |
| C-02 | Solo 4 normas (A.010, A.120, A.130, IS.010); "Estacionamientos" tiene 1 ficha.                                                                        | Ampliar a las normas de uso diario (bloque 2.7).                                                                  |
| C-03 | 25 materiales con precio "referencial Lima 2026" sin fuente ni fecha, y sin mano de obra.                                                             | Fecha y fuente por precio, precios editables por el usuario.                                                      |

---

## 5. Benchmark y brechas

| Referente                                | Qué resuelve                                               | TRAZZO hoy                                             | Brecha a cerrar                                                                                                                         |
| ---------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Neufert / fichas de medidas**          | Medidas de personas, muebles y ambientes de un vistazo     | 6 láminas ligadas a fichas del RNE                     | Módulo "Medidas de bolsillo": baño, cocina, dormitorio, clósets, mesas, circulaciones, alturas de montaje (bloque 2.1)                  |
| **MagicPlan**                            | Levantar ambientes en campo, áreas y estimados al instante | Nada de levantamiento                                  | Áreas de ambientes y terrenos irregulares, con paso directo a metrado (bloque 2.3). Escaneo con cámara queda fuera de alcance por ahora |
| **Tablas de rendimientos CAPECO**        | Materiales por m² o m³ y horas-hombre por partida          | Material suelto con un factor; sin mano de obra        | Calculadoras de materiales y partidas con receta (bloques 2.2 y 2.6)                                                                    |
| **S10 / Delphin / hojas de presupuesto** | Presupuesto por partidas con análisis de precios unitarios | Lista de materiales con subtotal                       | Presupuesto rápido: plantillas de partidas, capítulos, lista de compras, ratio por m² (bloque 2.6). No se busca reemplazar a S10        |
| **Calculadoras de obra para celular**    | Concreto, ladrillo, pintura, cerámico, conversor           | No existen                                             | Bloques 2.2 y 2.3                                                                                                                       |
| **Asistentes normativos (tipo UpCodes)** | Pregunta en lenguaje natural con cita y enlace al artículo | Asistente con citas sobre 17 fichas, solo con conexión | Más contenido, modo sin conexión, historial, enlaces a calculadora (bloques 2.7 y 2.8)                                                  |
| **Parámetros urbanísticos / cabida**     | Cuánto se puede construir en un lote                       | No existe                                              | Calculadora de cabida (bloque 2.4)                                                                                                      |

Ventajas propias que conviene proteger: funciona sin conexión, está pensada para Perú (RNE, soles, RUC, CAP), une norma + cálculo + presupuesto + propuesta en una sola app y sus láminas son paramétricas.

---

## 6. Hoja de ruta priorizada

Reglas de ejecución para todos los bloques:

- Un commit por bloque, con el formato `tipo(ámbito): descripción` que ya usa el repo.
- Antes de cada commit: `npm run typecheck`, `npm run lint`, `npm test` y, si el bloque toca interfaz, comprobación en navegador a 390–412 px.
- Cada bloque que cambia lógica añade o actualiza sus pruebas.
- Tras cada bloque se actualiza la sección 9.

### FASE 1 — Correcciones críticas y base móvil

| Bloque                                 | Qué se hace                                                                                                                                                                                | Resuelve                                           | Archivos                                                                                                                                                                                                                                                                              |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1.1 Plan único y sin conexión**      | Un solo `usePlan` con el plan y su vencimiento guardados en IndexedDB; reemplaza las 6 copias; límite de proyectos según plan; una sola tabla de qué incluye cada plan.                    | T-02, T-03, T-05, T-09                             | `src/lib/plans/use-current-plan.ts`, `src/lib/plans/plans.ts` (+ pruebas), `src/lib/offline/sync.ts`, `MetradosWorkspace.tsx`, `NormativaCatalog.tsx`, `NormativeDetail.tsx`, `AccountWorkspace.tsx`, `FeeQuoteWorkspace.tsx`, `CalculatorWorkspace.tsx`, `src/app/api/chat/route.ts` |
| **1.2 Sincronización real**            | Mapeo de campos y `user_id`, revisión de errores, cola que conserva lo fallido, estado "sincronizado", descarga de proyectos, partidas y cotizaciones, mensajes honestos.                  | T-01, T-17, T-18                                   | `src/lib/offline/sync.ts`, `src/lib/offline/repositories.ts`, `src/lib/offline/db.ts`, `src/lib/offline/hooks.ts`, nuevo `src/lib/offline/sync.test.ts`, `AccountWorkspace.tsx`, posible `supabase/migrations/005_*.sql`                                                              |
| **1.3 Sin conexión de verdad**         | Precarga de todas las rutas, respaldo `/~offline`, un solo registro del service worker, aviso de "nueva versión disponible".                                                               | T-04, T-24                                         | `src/app/sw.ts`, `next.config.mjs`, `src/app/layout.tsx`, `src/app/~offline/page.tsx`, `src/components/layout/AppBootstrap.tsx`                                                                                                                                                       |
| **1.4 Errores puntuales**              | PDF de metrados, textos dañados, lámina de agua, unidades de parámetros, cancelar edición, navegación al asistente, precio del acero, `id` duplicado, texto de verificación de estudiante. | T-07, T-08, T-10, T-14, T-20 a T-23, parte de T-15 | `MetradosWorkspace.tsx`, `TakeoffTable.tsx`, `checkout/route.ts`, `FeeQuoteWorkspace.tsx`, `src/data/seed-rne.ts`, nuevo `src/components/svg-diagrams/WaterTank.tsx`, `svg-diagrams/index.tsx`, `NormativeDetail.tsx`, `GlobalSearch.tsx`, `AccountWorkspace.tsx`                     |
| **1.5 Pagos y cupos**                  | Idempotencia por id + estado, registro del evento tras aplicar el plan, cupo del asistente en base de datos y descontado al responder.                                                     | T-06, T-12                                         | `src/app/api/webhooks/payments/route.ts`, `src/lib/payments/mercadopago.ts`, `src/lib/payments/payments.test.ts`, `src/app/api/chat/route.ts`, posible migración                                                                                                                      |
| **1.6 Base móvil**                     | Controles de 44 px, letra mínima de 12 px, campos a 16 px, foco visible, `100dvh`, barra inferior de 5 destinos, diálogo y avisos propios, lenguaje sin jerga.                             | U-03, U-04, U-05, U-08, U-11, U-12                 | `src/app/globals.css`, `BottomNav.tsx`, `Sidebar.tsx`, `Header.tsx`, nuevos `src/components/ui/Dialog.tsx` y `Toast.tsx`, `AccountWorkspace.tsx`, `AssistantWorkspace.tsx`, `AuthCard.tsx`, `ProjectList.tsx`                                                                         |
| **1.7 Llegar al dato rápido**          | Inicio como tablero de herramientas; calculadoras con resultado fijo visible y selector completo; ficha con valor arriba; sugerencias del asistente que envían.                            | U-01, U-02, U-06, U-07, U-13                       | `HomeDashboard.tsx`, `CalculatorWorkspace.tsx`, `CalculatorResult.tsx`, los 5 `*Calculator.tsx`, `NormativeDetail.tsx`, `AssistantWorkspace.tsx`, `globals.css`                                                                                                                       |
| **1.8 Rendimiento y red de seguridad** | jsPDF cargado solo al exportar, URL de búsqueda con retardo, lint activo en el build, flujo de CI (typecheck, lint, pruebas, build) y una prueba de humo de extremo a extremo.             | T-13, T-16, T-19                                   | `MetradosWorkspace.tsx`, `src/lib/pdf/export-proposal.ts`, `FeeQuoteWorkspace.tsx`, `NormativaCatalog.tsx`, `next.config.mjs`, nuevo `.github/workflows/ci.yml`, nuevo `e2e/smoke.spec.ts`                                                                                            |

Criterio de salida de la Fase 1: un usuario Pro crea 3 proyectos sin señal, exporta el PDF con columnas correctas, recupera la señal y ve sus datos en otro dispositivo; cualquier ruta abre sin conexión; el resultado de una calculadora se ve sin deslizar en un teléfono de 390 px.

### FASE 2 — Herramientas de alto valor

Orden propuesto por valor para el usuario frente a esfuerzo.

| Bloque                                            | Qué se añade                                                                                                                                                                                                                                                                                          | Archivos                                                                                                                                                                       |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **2.0 Matriz de relaciones** (pedido del usuario) | Herramienta de programación arquitectónica: lista de ambientes, matriz triangular de relaciones (necesaria, deseable, innecesaria) con ponderación, ranking por ambiente y diagrama de relaciones generado; se guarda en el dispositivo y se exporta a imagen o PDF. Se ejecuta primero en la Fase 2. | Nueva ruta `src/app/(dashboard)/matriz/page.tsx`, `src/components/matrix/*`, `src/lib/matrix/relations.ts` (+ pruebas), `src/lib/offline/db.ts`, navegación e Inicio           |
| **2.1 Medidas de bolsillo**                       | Fichas visuales de medidas antropométricas, mobiliario y ambientes mínimos (baño, cocina, dormitorio, clóset, comedor, escritorio, circulaciones, alturas de montaje), con dibujos propios y buscador.                                                                                                | Nueva ruta `src/app/(dashboard)/medidas/page.tsx`, `src/components/medidas/*`, `src/data/medidas.ts`, nuevas láminas en `src/components/svg-diagrams/`, navegación             |
| **2.2 Calculadoras de materiales**                | Concreto por resistencia, muro de ladrillo (soga, cabeza, canto), tarrajeo, contrapiso, cerámico y porcelanato, pintura, acero (kg ↔ varillas), losa aligerada. Botón "Enviar a metrado".                                                                                                             | `src/lib/calculators/materials/*.ts` (+ pruebas), `src/components/calculators/materials/*`, `CalculatorWorkspace.tsx`, `src/data/rendimientos.ts`                              |
| **2.3 Utilidades de campo**                       | Conversor de unidades (incluye pulgadas de fierro y tubería), pendientes (% ↔ grados ↔ relación), área de terrenos irregulares, escala de planos.                                                                                                                                                     | `src/lib/calculators/units.ts`, `slope.ts`, `area.ts` (+ pruebas), `src/components/calculators/tools/*`                                                                        |
| **2.4 Cabida de terreno**                         | Con área de lote, coeficiente, área libre, altura y retiros: área techada máxima, pisos y área vendible estimada.                                                                                                                                                                                     | `src/lib/calculators/cabida.ts` (+ pruebas), `src/components/calculators/CabidaCalculator.tsx`                                                                                 |
| **2.5 Más calculadoras del RNE**                  | Aforo por uso, aparatos sanitarios por uso, iluminación y ventilación natural, estacionamientos accesibles.                                                                                                                                                                                           | `src/lib/calculators/occupancy.ts`, `fixtures.ts`, `daylight.ts` (+ pruebas) y sus componentes                                                                                 |
| **2.6 Metrados 2.0**                              | Partidas con receta (un muro genera ladrillo, cemento y arena), capítulos, lista de compras, precios propios, duplicar proyecto, formulario según unidad, vista de tarjetas en móvil, ratio por m².                                                                                                   | `src/lib/calculators/takeoff.ts`, nuevo `src/data/partidas.ts`, `src/lib/offline/db.ts` (versión 4), `MetradosWorkspace.tsx`, `TakeoffTable.tsx`, `ProjectList.tsx`, migración |
| **2.7 Biblioteca RNE ampliada y verificada**      | Verificación de las 17 fichas y ampliación a normas de uso diario (A.020, A.070, A.080, A.130 completo, IS.010, estructuras básicas), con artículo y resolución; favoritos y recientes.                                                                                                               | `src/data/seed-rne.ts` (posible división por norma), `NormativaCatalog.tsx`, `NormativeDetail.tsx`, `HomeDashboard.tsx`, `src/lib/offline/db.ts`                               |
| **2.8 Asistente útil en obra**                    | Respuesta local sin conexión, historial guardado, enlaces a la ficha y a la calculadora relacionada.                                                                                                                                                                                                  | `AssistantWorkspace.tsx`, `ChatMessage.tsx`, `src/lib/rag/retrieve.ts`, `src/lib/offline/db.ts`                                                                                |
| **2.9 Buscador universal**                        | Un solo buscador para fichas, medidas, calculadoras, proyectos y cotizaciones.                                                                                                                                                                                                                        | `GlobalSearch.tsx`, `src/lib/search/search.ts`, nuevo `src/lib/search/catalog.ts` (+ pruebas)                                                                                  |
| **2.10 Honorarios por pasos**                     | Formulario dividido en pasos con total fijo, y envío del PDF con el menú de compartir del teléfono.                                                                                                                                                                                                   | `QuoteForm.tsx` (dividir en `src/components/fees/steps/*`), `FeeQuoteWorkspace.tsx`, `QuoteSummary.tsx`                                                                        |

### FASE 3 — Pulido visual y detalles profesionales

| Bloque                           | Qué se hace                                                                                                                             | Archivos                                                                                |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **3.1 Sistema de diseño**        | Dividir `globals.css` por módulos, quitar duplicados, tokens de tamaño y espacio, limpiar BOM.                                          | `src/app/globals.css` → `src/styles/*.css`, `src/components/ui/*`                       |
| **3.2 Modo obra**                | Tema de alto contraste para sol directo, tamaño de letra ajustable, estados de carga y vacíos cuidados, respeto a "reducir movimiento". | `globals.css`, `ThemeToggle.tsx`, `EmptyState.tsx`                                      |
| **3.3 Bienvenida e instalación** | Tres pasos iniciales (estudiante o profesional, herramientas favoritas) y guía para instalar en iPhone y Android.                       | Nuevo `src/components/onboarding/*`, `AppBootstrap.tsx`, `HomeDashboard.tsx`            |
| **3.4 Compartir resultados**     | Resultado de calculadora y ficha como imagen o PDF con la marca del estudio, listos para WhatsApp.                                      | `CalculatorResult.tsx`, nuevo `src/lib/pdf/export-result.ts`, `NormativeDetail.tsx`     |
| **3.5 Proyecto como eje**        | Guardar cálculos, metrados y cotización dentro de un proyecto; copia de seguridad en archivo.                                           | `src/lib/offline/db.ts`, `MetradosWorkspace.tsx`, `FeeQuoteWorkspace.tsx`, calculadoras |
| **3.6 Accesibilidad y calidad**  | Revisión AA de contraste y lectores de pantalla, pruebas de extremo a extremo de los flujos principales.                                | Transversal, `e2e/*`                                                                    |
| **3.7 App nativa**               | Corregir la configuración de Capacitor, cámara nativa y preparación para tiendas.                                                       | `capacitor.config.ts`, `README.md`                                                      |

---

## 7. Decisiones tomadas (2026-11-15)

1. **Barra inferior de 5 destinos: aceptada.** Inicio · Normas · Calcular · Proyectos (metrados y honorarios juntos) · Asistente, con Cuenta en el avatar.
2. **Gratis frente a pago: aceptado, con un cambio en el asistente.** El usuario considera poco 10 mensajes al mes. Queda así: Gratis **10 consultas por día**, Estudiante 50 por día, Pro ilimitado. Las respuestas armadas en el dispositivo sin usar el modelo no cuentan. El resto se mantiene: Gratis tiene todas las calculadoras, fichas básicas, 1 proyecto y PDF con marca de agua; sin cuenta se aplican las reglas de Gratis en todas las pantallas. Los límites viven en `src/lib/plans/plans.ts`.
3. **Fuente del RNE:** el usuario entregará el PDF actualizado del RNE y libros de arquitectura. Los bloques 2.1 y 2.7 dependen de esos archivos; hasta recibirlos, las fichas nuevas quedan "Por verificar". Los libros se usan como referencia para valores y criterios: los dibujos y textos de la app son propios.
4. **Precios y rendimientos: aceptado.** Valores referenciales con fecha visible y editables por el usuario.
5. **CI en GitHub Actions: activar** (bloque 1.8).
6. **Medidas de bolsillo con dibujos y textos propios: aceptado.**
7. **Orden de la Fase 2: a criterio del ejecutor.** Se añade el bloque 2.0, Matriz de relaciones, y va primero.
8. **Nueva herramienta pedida: matriz de relaciones (interacción)** → bloque 2.0.

## 8. Protocolo de ejecución y continuidad

- Se ejecuta al recibir "Aprobado, empieza", en el orden de la sección 6.
- Cada bloque termina con: verificación, commit, push a `claude/wonderful-noether-6eoymr` y actualización de la sección 9 en el mismo commit o en el siguiente.
- Si un bloque resulta más grande de lo previsto, se divide (1.6a, 1.6b…) y se anota en la sección 9.
- No se crea pull request salvo que lo pidas.
- Si aparece un hallazgo nuevo durante la ejecución, se añade a la sección 3 o 4 con su código y se asigna a un bloque.

---

## 9. ESTADO DE AVANCE Y HANDOFF

**Última actualización:** 2026-11-15 — plan aprobado; empieza la Fase 1.

### Completado

- [x] Auditoría técnica, de diseño y de contenido (secciones 2 a 4).
- [x] Benchmark y brechas (sección 5).
- [x] Hoja de ruta por fases y bloques (sección 6).
- [x] Trabajo previo a este plan: foto de perfil en Cuenta — commit `35f7176`.
- [x] Plan aprobado y decisiones registradas (sección 7).

### En curso o a medias

- [ ] Nada a medias. No se ha tocado código de la app para este plan.

### Pendiente

- [ ] Recibir del usuario el PDF del RNE y los libros (necesarios para 2.1 y 2.7).
- [ ] Fase 1: bloques 1.1 a 1.8 (ninguno iniciado).
- [ ] Fase 2: bloques 2.0 a 2.10.
- [ ] Fase 3: bloques 3.1 a 3.7.

### Instrucción para continuar (otra sesión u otra IA)

1. Trabaja en la rama `claude/wonderful-noether-6eoymr` del repo `crixb-be/trazzo`. Ejecuta `npm ci`.
2. Comprueba el punto de partida: `npm run typecheck && npm run lint && npm test` deben pasar (156 pruebas al cierre de la auditoría).
3. Si el usuario ya aprobó, empieza por el **bloque 1.1** de la sección 6: crea el `usePlan` único en `src/lib/plans/use-current-plan.ts` con caché en IndexedDB (tabla `meta` de `src/lib/offline/db.ts`), sustituye las consultas de plan copiadas en `MetradosWorkspace.tsx:61-74`, `NormativaCatalog.tsx`, `NormativeDetail.tsx`, `AccountWorkspace.tsx` y `sync.ts:19-30`, y cambia `MetradosWorkspace.tsx:100` para usar `canCreateProject`.
4. Si el usuario no ha aprobado, no modifiques código: pide la aprobación y las respuestas de la sección 7.
5. Tras cada bloque: verifica, haz commit y push, y actualiza esta sección con el hash del commit y, si algo queda a medias, el archivo y la línea exactos.

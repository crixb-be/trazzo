# Auditoría de producto, UX/UI y código — TRAZZO

**Fecha:** 21 de noviembre de 2026 · **Versión auditada:** `3dab75b` (TRAZZO 0.1.0)

## Método

La auditoría se hizo en dos revisiones independientes, que luego se consolidaron.

| Revisión                                | Alcance                                                                                                             | Cómo se verificó                                                                                                                                                                                      |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Claude** (arquitectura)               | Pantallas principales y flujos de Proyectos, Calculadoras, Inicio, Asistente, Normativa, Bitácora, Estudio y Cuenta | Inspección real en Chromium a **1440×900** y **390×844**, en **Claro** y **Oscuro** (44 capturas de página completa y acercamientos), mediciones del DOM y pruebas del campo de área contra IndexedDB |
| **Codex** (independiente, solo lectura) | `src/app`, `src/components`, `src/lib` y estilos relacionados                                                       | Lectura de código, `tsc`, ESLint, Vitest (316 pruebas) y reproducciones con IndexedDB simulado. Su entorno no pudo abrir Chromium, así que la parte visual se apoya en la revisión de Claude          |

Los hallazgos de Claude llevan prefijo **C** y los de Codex prefijo **T**. Cuando ambas revisiones detectaron lo mismo, se indica en la columna «Coincide».

**Severidad:** alta = puede perder o alterar datos, o bloquea una tarea principal · media = confunde o dificulta una tarea frecuente · baja = pulido, accesibilidad o deuda técnica.

---

## a) Bugs funcionales y estados confusos

| ID        | Sev.  | Pantalla                                | Problema                                                                                                                                                                                                                                                                         | Coincide |
| --------- | ----- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| T01       | Alta  | Proyectos                               | Una partida abierta para edición se guarda en otra obra si cambias de proyecto antes de guardar, y una partida eliminada mientras se editaba se vuelve a crear al guardar.                                                                                                       | —        |
| T02       | Alta  | Cuenta, Proyectos, Honorarios, Bitácora | El límite entre cuentas solo se aplica a la sincronización: en un navegador compartido, otra cuenta (o la sesión cerrada) sigue viendo los datos locales de la primera.                                                                                                          | —        |
| T03       | Alta  | Bitácora                                | Una visita sin guardar se pierde al navegar a otra sección desde el menú, porque la navegación interna no dispara `beforeunload`.                                                                                                                                                | —        |
| T04       | Alta  | Honorarios                              | Cambiar de cotización o pulsar «Nueva» descarta cambios sin aviso; si la misma cotización llega actualizada desde otro dispositivo, el formulario queda con la versión anterior y puede volver a publicarla.                                                                     | —        |
| T05       | Alta  | Todos los formularios numéricos         | El campo numérico reescribe en silencio lo pegado: `1,234.50` y `1.234,50` terminan como `1.2345`, `1.2.3` como `1.23` y `-20` como `20`. Puede alterar un presupuesto sin que se note.                                                                                          | —        |
| C01 / T06 | Media | Proyectos                               | **«Área construida» parece no hacer nada.** Muestra `0` mientras carga y cuando no está definida; al borrarla guarda `0`; su único efecto es una línea «Ratio S/ x por m²» dentro de «Planificar compras», lejos del total, y muestra `S/ 0.00 por m²` en una obra sin partidas. | Sí       |
| T07       | Media | Proyectos                               | La ficha de obra no tiene **cliente** y el **área** vive en una tabla local (`project_options`) que no se sincroniza: en otro dispositivo se pierde.                                                                                                                             | Sí (C01) |
| T08       | Media | Proyectos                               | Se pueden guardar partidas incompletas (un capítulo sin nombre de partida pasa la validación; un precio borrado se guarda como `0`) y el aviso de error aparece al final de la página, lejos del formulario.                                                                     | —        |
| T09       | Media | Asistente                               | Si falla la lectura del historial, el chat queda bloqueado aunque responder con las fichas locales es independiente.                                                                                                                                                             | —        |
| C05       | Media | Asistente                               | «Borrar historial de este dispositivo» es un botón de ancho completo, arriba del chat, incluso cuando no hay historial.                                                                                                                                                          | —        |
| T14       | Media | Todos los formularios                   | Escribir `/` en cualquier campo (por ejemplo `12/11` o `S/`) abre el buscador global y saca el foco del campo.                                                                                                                                                                   | —        |
| T15       | Media | Inicio (390 px)                         | La versión corta del estado de respaldo puede decir «En la nube» aunque la sincronización esté bloqueada por usar otra cuenta.                                                                                                                                                   | —        |
| C04       | Baja  | Proyectos                               | El primer bloque de la obra es «Duplicar proyecto» desactivado junto a «Tu plan no permite crear otro proyecto»: ocupa el lugar más visible sin aportar.                                                                                                                         | —        |
| T18       | Baja  | Login / Registro                        | El enlace mágico se puede solicitar varias veces seguidas, sin validar el correo ni mostrar estado pendiente.                                                                                                                                                                    | —        |

## b) Problemas visuales, de jerarquía, espaciado y consistencia

| ID        | Sev.  | Pantalla                    | Problema                                                                                                                                                                                                                                                                            | Coincide      |
| --------- | ----- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| C02       | Alta  | Proyectos (1440 px)         | La tabla de partidas mide **1206 px dentro de una tarjeta de 782 px**: Cantidad, Total, Subtotal y los botones editar/eliminar quedan ocultos a la derecha.                                                                                                                         | —             |
| C03       | Media | Proyectos                   | En la lista lateral, el nombre del proyecto se corta y los botones editar/eliminar quedan fuera de la tarjeta.                                                                                                                                                                      | —             |
| C06       | Media | Proyectos                   | La columna Material junta código y nombre sin separación (`arena-gruesaArena gruesa`), y las partidas de receta muestran L/A/H en `0.00`, que no significa nada.                                                                                                                    | —             |
| C07       | Baja  | Proyectos                   | «Totales por material» muestra códigos internos (`ladrillo-techo-15`) en vez de nombres.                                                                                                                                                                                            | —             |
| T11       | Media | Proyectos                   | Las tareas de la obra están dispersas en una sola columna larga: etapas, un bloque que mezcla duplicar/área/recetas/compras, el generador, y recién al final el formulario y las partidas. En una obra vacía, «Capítulos» y «Lista de compras» aparecen como títulos sin contenido. | Sí (C01, C04) |
| C08 / T10 | Media | Calculadoras                | Las pestañas subrayadas muestran solo 10 de los 16 módulos en escritorio; el resto queda en un desplazamiento horizontal con barra fina, y «Escaleras» (la pestaña inicial) es la octava. En móvil se reemplazan por un `select`, con un estilo distinto al de Normativa.           | Sí            |
| C09       | Baja  | Calculadoras                | En las tarjetas de resultado, «Copiar resultado» tiene otro estilo y otra altura que «Guardar en proyecto», «Compartir imagen» y «Compartir PDF».                                                                                                                                   | —             |
| C10       | Baja  | Asistente                   | «Prueba una consulta» aparece dos veces en escritorio: en el estado vacío del chat y en la columna lateral.                                                                                                                                                                         | —             |
| C11 / T17 | Baja  | Inicio                      | La tarjeta de Bitácora repite un acceso que ya está en el menú y en Estudio, mientras el asistente solo tiene un icono sin texto en la cabecera.                                                                                                                                    | Sí            |
| T16       | Media | Formularios (ambos temas)   | Los campos en reposo no tienen borde visible: dependen de un relleno con contraste ~1,14:1 (claro) y ~1,17:1 (oscuro) contra la tarjeta.                                                                                                                                            | —             |
| T20       | Baja  | Proyectos (390 px)          | En móvil, las partidas ocultan medidas, cantidad base y merma; para revisarlas hay que entrar a editar. Los botones de acción tienen el mismo nombre accesible en todas las filas.                                                                                                  | —             |
| T12       | Media | Formularios numéricos       | Si no se pasa `id`, la etiqueta visible no queda asociada al campo; `min`/`max`/`step` no se aplican en un `input type="text"`.                                                                                                                                                     | —             |
| T13       | Media | Diálogos                    | Los diálogos de confirmación, proyecto y planes no contienen el foco ni lo devuelven al cerrar; la confirmación destructiva enfoca directamente «Eliminar».                                                                                                                         | —             |
| T19       | Baja  | Proyectos, Honorarios       | Hay un `<main>` dentro del `<main>` del panel.                                                                                                                                                                                                                                      | —             |
| T21       | Baja  | Inicio, Proyectos, Bitácora | Dos hooks hacen la misma consulta de proyectos con contratos de carga distintos; Inicio lee todas las partidas para sumar tres obras.                                                                                                                                               | —             |
| T22       | Baja  | —                           | El componente `Tabs` se exporta sin ningún uso.                                                                                                                                                                                                                                     | —             |

---

## c) Mejoras aplicadas en esta entrega

Las correcciones las implementó Codex sobre una especificación de arquitectura. Claude revisó el código, repitió todas las validaciones y corrigió tres detalles visuales que encontró en las capturas finales. Se aplicaron todos los hallazgos. Las acciones de despliegue que siguen abiertas figuran en «Pendiente».

### Pedidos de esta entrega

| Pedido                          | Qué cambió                                                                                                                                                                                                                                                                                                                                                                                                       | IDs           |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| **Chat IA en Inicio**           | Se quitó la tarjeta de Bitácora del Inicio (sigue en el menú y en Estudio). En su lugar está la tarjeta **«Pregunta al Asistente RNE»**, con botón «Abrir chat» y tres preguntas de ejemplo que abren `/asistente?q=…` con la pregunta ya escrita, sin enviarla. Se mantiene el botón ✦ de la cabecera.                                                                                                          | C11, T17      |
| **Proyectos claro e intuitivo** | La sección se llama **«Proyectos de obra»**. Cada proyecto tiene una cabecera compacta (tipología, estado, nombre, ubicación, cliente, total, Duplicar, CSV y PDF) y tres pestañas con URL propia (`?tab=resumen`, `metrados` o `vinculos`): **Resumen y etapas**, **Metrados y presupuesto** y **Cálculos y bitácora**.                                                                                         | T11, C04      |
| **Área construida**             | Ahora es un dato del proyecto (`builtArea`) que se sincroniza con la nube. Vacía muestra el campo vacío con «Ej. 120» (nunca un `0` falso); al borrarla se guarda vacía; cada valor válido se guarda al instante con el aviso «Guardado». Debajo, **Indicadores en tiempo real**: Área techada, Costo total estimado, Ratio S/ por m² y Partidas. Cuando falta un dato, explica qué hacer en vez de mostrar `0`. | C01, T06, T07 |
| **Píldoras en Calculadoras**    | Las pestañas subrayadas y el `select` móvil se reemplazaron por una sola navegación de píldoras, con el mismo estilo que Normativa. En escritorio se ven los 16 módulos en filas, sin barra de desplazamiento. En móvil hacen scroll táctil con la barra oculta y la píldora activa queda visible.                                                                                                               | C08, T10      |

El ratio S/ por m² se rotula como «Estimación referencial · materiales a precios Lima 2026, sin mano de obra». No se inventaron precios de referencia por m²: el indicador se calcula siempre con las partidas reales del proyecto (total ÷ área construida).

### Datos y sincronización

- **Espacio local por cuenta (T02).** El espacio sin cuenta conserva `TrazzoDB` y cada cuenta abre su propia base, con perfil, historial, cola de sincronización, lista de expediente y borradores aislados. El traslado reanudable confirma el destino antes de limpiar el origen. Los datos previos con propietario van a su cuenta. Para pasar los datos sin propietario se pide permiso y la opción queda en Cuenta. Cerrar sesión abre el espacio sin cuenta, con una acción separada y confirmación para borrar la copia local de la cuenta.
  - _Revisión de Claude:_ en una instalación **sin Supabase configurado** no hay cuentas que aislar, así que los datos se quedan en el espacio sin cuenta aunque una versión anterior los haya asociado a un dueño. Sin esta salvaguarda quedaban apartados en una base de cuenta a la que no se puede entrar (verificado en Chromium con una base antigua sembrada). El aviso para pasar los datos sin cuenta nombra solo lo que existe, con plurales correctos («1 proyecto», «2 cotizaciones»), y nunca dice «0 proyectos» cuando solo hay fichas recientes o historial.
- **Consultas de proyectos (T21).** Inicio, Proyectos, Bitácora y los selectores comparten un hook que distingue entre carga y lista vacía. Inicio consulta por `projectId` las partidas de los tres proyectos activos que muestra.
- **Ficha de obra completa.** `Project` incorpora `client` y `builtArea`. La actualización local **Dexie v10** copia el área que estaba en `project_options` (solo local) al proyecto, la deja pendiente de sincronizar y elimina esa tabla. Los respaldos antiguos con `projectOptions` se siguen importando.
- **Migración remota** `supabase/migrations/20261121010000_project_details.sql`: agrega `client` y `built_area` a `projects`.
- **Compatibilidad si la migración aún no se aplicó:** si Supabase responde que la columna no existe (`PGRST204` / `42703`), la sincronización reintenta sin esas dos columnas y conserva los valores en el dispositivo, así que los proyectos siguen sincronizando.
- **Partidas protegidas (T01):** una edición queda ligada a su proyecto de origen. Si la partida se eliminó mientras se editaba, no se recrea.
- **Borradores recuperables:** en **Bitácora (T03)**, el editor guarda un borrador local por visita y ofrece recuperarlo al volver («Recuperamos cambios sin guardar · Descartar»). En **Honorarios (T04)**, cambiar de cotización con cambios pendientes pregunta Guardar, Descartar o Cancelar, y una versión más nueva llegada por sincronización recarga el formulario si no hay cambios locales.

### Formularios y validación

- **Campo numérico (T05, T12):** ya no reescribe lo que escribes. Acepta un solo separador decimal (`.` o `,`). Si pegas `1,234.50`, `1.234,50`, `1.2.3` o un negativo en un campo positivo, el texto queda visible, el campo se marca como inválido y aparece el motivo junto a él. Lo mismo con `min` y `max`. La etiqueta queda asociada con un `id` propio y la unidad se anuncia a lectores de pantalla.
- **Partidas (T08):** el nombre es obligatorio (un capítulo solo no basta), las medidas que aplican deben ser mayores que cero y el precio vacío es inválido (un `0` explícito sí se acepta). Los errores aparecen junto a cada campo, el botón se desactiva mientras guarda y se confirma con un aviso.
- **Proyecto (T13):** el nombre es obligatorio, con un error visible en el diálogo.
- **Bordes de campos (T16):** nuevo token `--input-border` con contraste de al menos 3:1 contra la tarjeta, en Claro y Oscuro.
- **Atajo de búsqueda (T14):** `/` y Ctrl/Cmd+K ya no se disparan al escribir en campos de texto ni durante la composición de caracteres.
- **Acceso por enlace (T18):** valida el correo, evita envíos duplicados, muestra «Enviando enlace…» y anuncia el resultado.

### Tabla de partidas y lista de proyectos

- **Tabla (C02, C06, T20):** en escritorio entran todas las columnas y las acciones. L/A/H se unieron en una columna **Medidas** que muestra solo las que aplican, o «—» en las partidas de receta. El nombre del material va arriba y el código abajo, en pequeño. En móvil, cada partida es una tarjeta con «Ver detalle» para revisar medidas, cantidad base, merma, precio unitario y total. Los botones editar y eliminar incluyen el nombre de la partida en su etiqueta accesible.
- **Lista de proyectos (C03):** el nombre se recorta con «…» dentro de la tarjeta y editar/eliminar están siempre visibles, con el nombre del proyecto en su etiqueta.
- **Capítulos, compras y totales (C07, T11):** muestran nombres de material (con el código como dato secundario) y un estado vacío útil cuando aún no hay partidas.

### Consistencia y accesibilidad

- **Botones de resultado (C09):** Copiar, Guardar en proyecto, Compartir imagen y Compartir PDF usan la misma píldora y la misma altura, y se acomodan en varias líneas a 390 px.
- **Asistente (C05, C10, T09):** «Borrar historial» solo aparece cuando hay historial. Las sugerencias aparecen una sola vez, en el estado vacío del chat. Si falla la lectura del historial, se puede seguir chateando y se ofrece Reintentar o Restablecer.
- **Estado de respaldo (T15):** el texto largo, el corto y el icono salen de una sola función; el bloqueo por otra cuenta tiene prioridad.
- **Diálogos (T13):** un único componente modal con foco contenido, Escape para cerrar, foco inicial en «Cancelar» en acciones destructivas y retorno del foco al botón que lo abrió.
- **Estructura (T19, T22):** se reemplazaron los `<main>` anidados por secciones con nombre y se eliminó el componente `Tabs`, que no se usaba.
- **Ajustes de Claude tras la revisión visual:** se quitó el botón «Editar ficha» duplicado de la cabecera del proyecto (queda en la tarjeta de ficha). En móvil, las tres pestañas del proyecto se reparten en columnas iguales y el total se alinea a la izquierda. En la barra lateral, «Nuevo proyecto» baja de línea en vez de partir el título.

### Verificación

| Comprobación                     | Resultado                                                                                                                                |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck` (sin `.env`) | Sin errores                                                                                                                              |
| `npm run lint`                   | Sin errores                                                                                                                              |
| `npm test`                       | **330 pruebas** en 61 archivos (eran 316)                                                                                                |
| `npm run build` (sin `.env`)     | Compila; solo la advertencia conocida de `@ai-sdk` en `/api/chat`                                                                        |
| `npx playwright test`            | **30 pruebas** e2e, incluida accesibilidad AA en ambos temas                                                                             |
| `scripts/audit-overlaps.mjs`     | **78 pantallas** a 1440×900 y 390×844, Claro y Oscuro (más la tabla de partidas a 1024 px): sin solapes, desbordes ni errores de consola |
| Capturas revisadas a ojo         | Inicio, Proyectos (las tres pestañas, con y sin área), Calculadoras y Asistente, en los cuatro modos                                     |

Pruebas nuevas: indicadores del proyecto, estado de respaldo, borradores de Bitácora, parser numérico, mapeos de `client`/`built_area`, reintento sin columnas nuevas, actualización Dexie v10, importación de respaldos antiguos, protección de partidas editadas y el recorrido e2e `ux-functional.spec.ts`.

La verificación de **T02** y **T21** pasó con `npm run typecheck`, `npm run lint`, `npm test` (**347 pruebas** en 63 archivos), `npm run build` sin `.env`, `npx playwright test --workers=4` (30 pruebas en modo local) y `scripts/audit-overlaps.mjs` (78 pantallas sin incidencias). Las pruebas unitarias, sobre IndexedDB simulado, cubren cada caso de conciliación de propietarios, la reanudación sin duplicados tras un traslado interrumpido, el borrado protegido de la copia local y el texto del aviso. En Chromium se comprobó además que una base antigua con dueño sigue visible en modo sin Supabase y que no se crea ninguna base de cuenta.

### Pendiente

**Migraciones de Supabase:** aplicadas en producción el 21 de noviembre de 2026. `site_logs` ya estaba creada y coincidía con su migración; `project_details` se aplicó y la API REST reconoce `client` y `built_area`.

**Prueba manual con cuentas reales (pendiente):** las pruebas automáticas corren sin Supabase, así que el recorrido con sesiones reales debe confirmarse a mano en un mismo navegador:

1. Sin sesión, crea un proyecto «Prueba invitado».
2. Inicia sesión con la cuenta A: debe aparecer el aviso «Datos sin cuenta en este dispositivo». Elige «Pasar a mi cuenta» y confirma que el proyecto aparece y se sincroniza.
3. Cierra sesión: Proyectos debe quedar vacío (espacio sin cuenta).
4. Inicia sesión con la cuenta B: no debe ver nada de A. Crea «Prueba B».
5. Vuelve a A: debe ver solo «Prueba invitado», no «Prueba B».
6. En A, usa «Cerrar sesión y borrar los datos de esta cuenta en este dispositivo» y confirma que, al volver a entrar con A, sus datos se descargan otra vez desde la nube.

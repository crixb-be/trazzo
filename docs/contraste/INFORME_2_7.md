# Contraste documental RNE · TRAZZO

Fecha: 2026-11-17. Corpus de verdad: archivos aportados en `docs/rne/`; no se sustituyen por tablas recordadas ni por libros internacionales.

## Alcance y resultado

Se encontraron **18 PDFs RNE**, no 17, y **dos libros escaneados**. Se extrajo el texto de todas las páginas de los 18 PDFs y se generó un índice de artículos, capítulos, cuadros y tablas. El contraste de código se concentra en las reglas que la app calcula o publica. Hay 33 fichas contrastadas, cada una con documento, página PDF, artículo, fecha y hash SHA-256. Las 17 fichas originales fueron revisadas y corregidas. Las guías E.020/E.060 fueron retiradas porque esos textos no fueron aportados; se incorporó E.030-2026 con su alcance explícito.

**Esto acredita correspondencia con el corpus aportado; no es una certificación de cumplimiento de un proyecto ni una comprobación independiente de todas las modificatorias vigentes a noviembre de 2026.** Algunas reproducciones no identifican instrumento aprobatorio o historial consolidado. Esa ausencia se conserva visible, no se inventa una resolución.

## Hallazgos y decisiones

| Regla                   | Corrección y respaldo                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Vivienda: agua          | IS.010-2025 es la **RM 0107-2025-VIVIENDA**, publicación 12/04/2025, tres páginas de El Peruano. Modifica 2.2.a y deroga 2.2.b: cálido **169**, templado **155**, frío **129 L/persona/día**. Semifrígido, frígido y glaciar → frío. Clima del mapa SENAMHI. Se retiraron tablas antiguas por área del lote y por departamento.                                                                                                                  |
| Densidad de vivienda    | A.020 art.7 cuadro2: 1/2/3 dormitorios → 2/3/4 personas; para más de3 dormitorios en multifamiliar: +1 persona/dormitorio; colectiva:1/dormitorio. No se extrapola esa regla a unifamiliar de más3 dormitorios sin población sustentada.                                                                                                                                                                                                         |
| Oficinas: agua          | A.080 art.17 del PDF aportado: **20 L/persona/día**, jardines **5 L/m²/día**. Se retiró el valor automático de6 L/m²/día. No se aplica el clima residencial a oficinas.                                                                                                                                                                                                                                                                          |
| Almacenamiento de agua  | El PDF IS.010-2025 **no contiene el texto base completo**, reglas de cisterna/tanque ni un capítulo de ventilación. Se deshabilitó su dimensionamiento automático y se retiraron fórmulas de las láminas. No se presenta una fórmula sin fuente como regla contrastada. La ventilación se contrastó con A.010/A.080.                                                                                                                             |
| Transición IS.010       | La disposición final mantiene el texto anterior para proyectos con expediente aprobado en Invierte.pe o con procedimiento de licencia iniciado antes de la modificatoria. El modo actualizado advierte esta condición; no reproduce automáticamente el régimen anterior.                                                                                                                                                                         |
| Rampas                  | A.120-2023 RM075, art.6.b: hasta0.30m **10%**, de0.31 a0.72m **8%**; fuera de rango no se extrapola. Se retiró la tabla12/10/8/6/4/2%. Para decimales entre0.30 y0.31 se usa8% como decisión conservadora, no como una nueva fila del texto.                                                                                                                                                                                                     |
| Rampas: geometría       | Arts.6–7: ancho1.00m incluidos pasamanos/barandas sin invadir ruta; máximo9m de rampa y descanso1.50m. Longitud se calcula con la pendiente **usada**, y no se confunde longitud de rampa con longitud de descanso. Doble pasamanos; condiciones adicionales para rampas mayores3m. Pendiente transversal<2% y maniobras por aforo deben revisarse en proyecto (no certificadas por la calculadora).                                             |
| Acceso y giro           | A.120 art.4.b: **vano mínimo1.00m**, no se confunde con luz libre. Art.5.f: espacio **1.50×1.50m cada25m** de circulación, giro360°. Los descansos de art.6.d dependen de aforo; no se universaliza un círculo. Se conservan diámetro y radio como magnitudes diferentes.                                                                                                                                                                        |
| Estacionamientos        | A.120 arts.20–23: hasta500, **4% con redondeo superior**; adicionales:20 base +1/cada100 o fracción. Individual **3.70×5.00m**, altura2.10m; dos continuos6.20m con condición de colindancia. Se retiran3.80m y la antigua tabla por tramos.                                                                                                                                                                                                     |
| Escaleras               | A.010 art.23.2: máximo17 **pasos** entre descansos; no se publica como17 contrapasos. El modelo distingue pasos horizontales de contrapasos. Paso mínimo0.25/0.28/0.30m según uso; contrapaso máximo0.18m. Blondel se conserva como criterio de diseño, no intervalo obligatorio de A.010.                                                                                                                                                       |
| Puertas y alturas       | Anchos de vivienda0.90/0.80/0.70m provienen de **A.020 art.12.2.b**, no A.010. A.010 art.19.1: vano2.10m con excepción de cortafuego certificado. A.010 art.18: alturas por uso, no2.30m universal de circulación.                                                                                                                                                                                                                               |
| Pozos de luz            | Se retiran H/3 y H/4 como regla vigente general. A.020 art.11.3, cuadros3/4: mínimos por tipología, lados propios y suma por tramos de18m; más72m incremento0.10m/m. La herramienta cubre bifamiliar/multifamiliar; no certifica compensaciones, dimensión paralela ni retranques.                                                                                                                                                               |
| Evacuación              | A.130 arts.22–24: puertas/rampas0.005m/persona, **redondeo superior en módulos0.60m**; puerta hacia escalera mínimo1m. Pasajes mínimo1.20m con excepción oficina<50 personas0.90m. Escaleras0.008m/persona, mínimo1.20m, sin aplicar redondeo de puertas. Salud/asilos sin rociadores:0.013 puertas/rampas y0.015 escaleras.                                                                                                                     |
| Recorridos              | A.130 arts.26–27: límite horizontal general45m sin rociadores /60m con ellos; medir hasta medio seguro. No se reemplaza número de salidas ni exigencias especiales por una comprobación de distancia.                                                                                                                                                                                                                                            |
| Aforos                  | A.080 art.6:9.5m²/persona. A.070 art.8 cuadro2:2.8 solo tienda independiente de primer piso; restaurante/mesas1.5. A.040 art.13.2 cuadro3:aula1.5 para evacuación, distinto de requisitos de diseño MINEDU. Los coeficientes normativos no son editables como si otro valor tuviera el mismo respaldo.                                                                                                                                           |
| Aparatos sanitarios     | A.080 art.15 y A.070 art.16.4–16.5: se usa **población total de la tabla**, no se repite la tabla por cada sexo. Se separan mixto, hombres/mujeres y empleados/público, con umbrales e incrementos de sus respectivos cuadros. No se generaliza a otros establecimientos ni se omite revisión de accesibilidad A.120.                                                                                                                            |
| Iluminación/ventilación | A.010 art.36 no prescribe10% universal de vidrio. Art.38.2 abertura≥5%; oficinas A.080 art.5 exige abertura **superior al10%**. La interfaz deja de declarar cumplimiento de iluminación mediante un porcentaje inventado.                                                                                                                                                                                                                       |
| E.030-2026              | RM183-2026, publicada03/05/2026. Z de tabla1. S/TP/TL de tablas4/5: S2/S3 tienen intervalos; se implementa únicamente el caso **sin Vs30** de su nota. S4/Z4 requiere respuesta de sitio y no arroja un valor tabulado falso. C espectral para T<0.2TP =1+7.5T/TP; C estático=2.5 en todo T≤TP. R=R0·Ia·Ip; V=Z·U·C·S·P/R, C/R≥0.11. No determina suelo por ciudad ni certifica admisibilidad del método estático o diseño estructural completo. |

## A.130: cobertura e integridad

El índice de consulta contiene **218 artículos, del1 al218, sin saltos**. Las dos referencias cruzadas a artículo25 que no son encabezados se conservan en el cuerpo correspondiente y no generan artículos duplicados. Cada entrada conserva página PDF y texto extraído. Las figuras/tablas gráficas y fórmulas con fuentes especiales pueden no ser fieles al texto extraído: revisar siempre el PDF para esos elementos. No se afirma que el archivo sea una consolidación con toda modificatoria posterior.

## Biblioteca internacional

Neufert (268p PDF) y Ching (414p PDF) son escaneos sin capa de texto aprovechable. Se ejecutó OCR focalizado (110dpi, Tesseract `eng`, con sus errores) en **65 páginas únicas**: Neufert1–45, Ching1–20; se revisaron índices y se estructuraron temas con resúmenes propios. **No se afirma una lectura/OCR integral de las682 páginas.** La lámina Neufert PDF39/impresa26 fue revisada visualmente porque el OCR de sus cotas falló: figura12, cuerpo ilustrado de0.50m de ancho y1.75m de altura. Es ejemplo de medidas promedio, no percentil poblacional ni exigencia peruana.

La interfaz distingue **Normativa Peruana Obligatoria (RNE)** de **Teoría y Referencia Arquitectónica Internacional**. Las demás medidas y módulos sin referencia puntual siguen como **plantillas ilustrativas de TRAZZO**, sin atribuirlas a Neufert/Ching ni marcarlas como mínimas RNE. No se distribuyen en `public/` los PDFs ni se reproducen láminas de los libros; los dibujos de la app son propios.

## Datos remotos e historial

Se evita que un catálogo remoto antiguo sobrescriba las fichas contrastadas empaquetadas. La recuperación vectorial reconstituye el texto actual por slug en lugar de devolver chunks obsoletos. El seed remoto proyecta solo las columnas existentes y conserva trazabilidad en `legal_note`, sin requerir una migración SQL. No se ejecutó seed ni embedding remoto ni se aplicó SQL. Los documentos y cálculos históricos de los usuarios no se reescriben como si hubieran sido verificados de nuevo.

## Matriz de fichas

Página corresponde a numeración del PDF, no necesariamente a numeración impresa. El hash completo está en `inventario.json` y en la ficha.

| Ficha                           | Norma / artículo                                                  | Página PDF | Archivo                                                            |
| ------------------------------- | ----------------------------------------------------------------- | ---------- | ------------------------------------------------------------------ |
| `escalera-paso-contrapaso`      | A.010 · Art. 23.2.b–c                                             | 17         | `A.010-Condiciones-Generales-de-Diseno-Actualizado-julio-2021.pdf` |
| `escalera-tramo-maximo`         | A.010 · Art. 23.2.a                                               | 17         | `A.010-Condiciones-Generales-de-Diseno-Actualizado-julio-2021.pdf` |
| `altura-libre-minima`           | A.010 · Art. 18.1–18.3                                            | 14         | `A.010-Condiciones-Generales-de-Diseno-Actualizado-julio-2021.pdf` |
| `vano-puerta-altura`            | A.010 · Art. 19.1                                                 | 14         | `A.010-Condiciones-Generales-de-Diseno-Actualizado-julio-2021.pdf` |
| `puerta-ancho-minimo`           | A.020 · Art. 12.2.b                                               | 7          | `A.020-RNE-actualizada-el-2021.pdf`                                |
| `pozo-luz-ambientes-habitables` | A.020 · Art. 11.3, cuadros 3 y 4                                  | 5          | `A.020-RNE-actualizada-el-2021.pdf`                                |
| `pozo-luz-servicios`            | A.020 · Art. 11.3, cuadros 3 y 4                                  | 5          | `A.020-RNE-actualizada-el-2021.pdf`                                |
| `rampa-pendiente-maxima`        | A.120 · Art. 6.b–c                                                | 13         | `A.120-2023.pdf`                                                   |
| `rampa-ancho-descanso`          | A.120 · Art. 6.a,c,d,e; art. 7                                    | 13         | `A.120-2023.pdf`                                                   |
| `giro-silla-ruedas`             | A.120 · Art. 5.f; art. 6.d                                        | 11         | `A.120-2023.pdf`                                                   |
| `puerta-accesible-ancho`        | A.120 · Art. 4.b                                                  | 8          | `A.120-2023.pdf`                                                   |
| `estacionamiento-accesible`     | A.120 · Arts. 20–23                                               | 43         | `A.120-2023.pdf`                                                   |
| `ancho-evacuacion-por-ocupante` | A.130 · Arts. 22–24                                               | 4          | `A.130-Requisitos-de-seguridad.pdf`                                |
| `distancia-maxima-recorrido`    | A.130 · Arts. 26–27                                               | 5          | `A.130-Requisitos-de-seguridad.pdf`                                |
| `escalera-evacuacion-ancho`     | A.130 · Arts. 22–24                                               | 4          | `A.130-Requisitos-de-seguridad.pdf`                                |
| `dotacion-agua-vivienda`        | IS.010 · Numeral 2.2.a; RM art. 1 y disposición derogatoria       | 2          | `IS.010-2025.pdf`                                                  |
| `dotacion-agua-multifamiliar`   | IS.010 · Numeral 2.2.a; RM art. 1 y disposición derogatoria       | 2          | `IS.010-2025.pdf`                                                  |
| `vivienda-programa-a020`        | A.020 · Arts. 7 y 11                                              | 4          | `A.020-RNE-actualizada-el-2021.pdf`                                |
| `comercio-aforo-a070`           | A.070 · Art. 8, cuadro 2                                          | 6          | `A.070 COMERCIO - RM N°061-2021-VIVIENDA.pdf`                      |
| `oficinas-aforo-a080`           | A.080 · Arts. 5, 6 y 15                                           | 2          | `A.080 OFICINAS.pdf`                                               |
| `seguridad-rutas-a130`          | A.130 · Arts. 1–requisitos finales; índice completo en Biblioteca | 1          | `A.130-Requisitos-de-seguridad.pdf`                                |
| `sanitarios-dotacion-is010`     | IS.010 · Numeral 2.2.a; RM 0107-2025 art.1                        | 2          | `IS.010-2025.pdf`                                                  |
| `consulta-g010`                 | G.010 · Art. 1 (ámbito); consultar índice de artículos            | 1          | `G.010.pdf`                                                        |
| `consulta-g020`                 | G.020 · Artículo Único, literales a–g                             | 1          | `G.020.pdf`                                                        |
| `consulta-g040`                 | G.040 · Artículo Único (definiciones obligatorias)                | 2          | `G.040-2021.pdf`                                                   |
| `consulta-a030`                 | A.030 · Art. 1 (ámbito); consultar índice de artículos            | 2          | `A-030-2019-HOSPEDAJE.pdf`                                         |
| `consulta-a040`                 | A.040 · Art. 1 (ámbito); consultar índice de artículos            | 3          | `A.040 EDUCACIÓN - RM N° 068-2020-VIVIENDA.pdf`                    |
| `consulta-a050`                 | A.050 · Art. 1 (ámbito); consultar índice de artículos            | 1          | `A.050 SALUD DS N° 011-2012.pdf`                                   |
| `consulta-a060`                 | A.060 · Art. 1 (ámbito); consultar índice de artículos            | 1          | `A.060 INDUSTRIA.pdf`                                              |
| `consulta-a090`                 | A.090 · Art. 1 (ámbito); consultar índice de artículos            | 1          | `A.090 SERVICIOS COMUNALES.pdf`                                    |
| `consulta-a100`                 | A.100 · Art. 1 (ámbito); consultar índice de artículos            | 3          | `A.100 RECREACIÓN Y DEPORTES DS N° 006-2014.pdf`                   |
| `consulta-a110`                 | A.110 · Art. 1 (ámbito); consultar índice de artículos            | 1          | `A.110.pdf`                                                        |
| `consulta-e030`                 | E.030 · Arts. 11,17,18,26,34                                      | 4          | `E.030-Diseno-sismorresistente-2026.pdf`                           |

## Documentos inventariados

| Archivo                                                                     | Páginas PDF | Texto extraíble    |
| --------------------------------------------------------------------------- | ----------- | ------------------ |
| `docs/rne/A-030-2019-HOSPEDAJE.pdf`                                         | 19          | Sí                 |
| `docs/rne/A.010-Condiciones-Generales-de-Diseno-Actualizado-julio-2021.pdf` | 47          | Sí                 |
| `docs/rne/A.020-RNE-actualizada-el-2021.pdf`                                | 16          | Sí                 |
| `docs/rne/A.040 EDUCACIÓN - RM N° 068-2020-VIVIENDA.pdf`                    | 12          | Sí                 |
| `docs/rne/A.050 SALUD DS N° 011-2012.pdf`                                   | 10          | Sí                 |
| `docs/rne/A.060 INDUSTRIA.pdf`                                              | 3           | Sí                 |
| `docs/rne/A.070 COMERCIO - RM N°061-2021-VIVIENDA.pdf`                      | 16          | Sí                 |
| `docs/rne/A.080 OFICINAS.pdf`                                               | 3           | Sí                 |
| `docs/rne/A.090 SERVICIOS COMUNALES.pdf`                                    | 2           | Sí                 |
| `docs/rne/A.100 RECREACIÓN Y DEPORTES DS N° 006-2014.pdf`                   | 12          | Sí                 |
| `docs/rne/A.110.pdf`                                                        | 3           | Sí                 |
| `docs/rne/A.120-2023.pdf`                                                   | 65          | Sí                 |
| `docs/rne/A.130-Requisitos-de-seguridad.pdf`                                | 78          | Sí                 |
| `docs/rne/E.030-Diseno-sismorresistente-2026.pdf`                           | 68          | Sí                 |
| `docs/rne/G.010.pdf`                                                        | 3           | Sí                 |
| `docs/rne/G.020.pdf`                                                        | 2           | Sí                 |
| `docs/rne/G.040-2021.pdf`                                                   | 28          | Sí                 |
| `docs/rne/IS.010-2025.pdf`                                                  | 3           | Sí                 |
| `docs/biblioteca/ERNST NEUFERT- ARTE DE PROYECTAR EN ARQUITECTURA.pdf`      | 268         | No; OCR focalizado |
| `docs/biblioteca/FRANCIS D.K. CHING- FORMA, ESPACIO Y ORDEN.pdf`            | 414         | No; OCR focalizado |

## Verificación y límites de cierre

Las pruebas cubren valores límite normativos, integridad/hash del corpus, los218 artículos, proyección de columnas y protección contra catálogo remoto obsoleto. Las verificaciones de interfaz prueban demanda por clima, rampas, estacionamientos, trazabilidad, consulta A.130 y separación de fuentes. Resultado final: typecheck y lint sin errores (cinco avisos previos de imágenes), **227 pruebas unitarias en43 archivos**, build y **25 pruebas de navegador** pasan. Incluyen accesibilidad AA en19 rutas ×3 temas. La copia/restauración pasó además5 repeticiones consecutivas tras corregir carreras de hidratación/carga/navegación detectadas durante QA. El buscador identifica RNE, referencias internacionales y plantillas, y el filtro normativo se genera de las18 normas del corpus. No se enviaron archivos mediante el menú nativo de compartir ni se probó Supabase real.

**Pendiente externo al contraste de este corpus:** texto íntegro de IS.010 y demás modificatorias sanitarias para recuperar almacenamiento y otras dotaciones con respaldo; comprobación de historial completo y autenticidad/consolidación de las reproducciones sin instrumento consignado; aplicación de regímenes transitorios por proyecto; revisión profesional integral de condiciones no modeladas. No corresponde garantizar «todo proyecto cumple el RNE vigente2026» con estos archivos ni marcar esos pendientes como resueltos.

### Lectura conjunta de normas

El12% del artículo16 de A.130 describe rampas como medios de evacuación; **no sustituye** los máximos10%/8% de A.120-2023 cuando el recorrido también debe ser accesible. Del mismo modo, el5% general de ventilación de A.010 no reemplaza el requisito superior al10% de A.080 para oficinas. Las tablas se aplican por alcance, no escogiendo automáticamente el valor menos exigente.

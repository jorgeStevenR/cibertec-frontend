# Historial del proyecto — Cibertec Frontend

> Este archivo es el punto de partida de cualquier sesión nueva (ver `CLAUDE.md`).
> "Estado actual" y "Pendiente" son una **foto del momento** — se reescriben en
> cada actualización, no se les va agregando texto indefinidamente. El único
> apartado que crece con el tiempo es el "Log de sesiones".

## Resumen del proyecto

Frontend Angular (standalone components + signals) de una plataforma educativa
tipo Moodle, con cuatro roles — Administrador, Gestor de Usuarios, Profesor y
Estudiante — que consumen una API REST propia (backend aparte, no incluido en
este repo).

## Estado actual

- **Listo para desplegar (2026-10-21)**: environments de Angular, script
  `build:produccion` con `API_BASE_URL`, `vercel.json` y `netlify.toml` (build,
  carpeta de salida y redirección de rutas a `index.html`), README real. No se
  publicó nada; falta que el backend esté en HTTPS y acepte el dominio en CORS.
- **Login** y guards por rol (admin/profesor/estudiante). Rediseño visual: panel
  izquierdo con carrusel de fotos (rota cada 6s, `photo-carousel` en
  `shared/ui/molecules`), logo real de Cibertec (`public/logo-ciberctec.png`)
  arriba a la izquierda del lado blanco, toggle de mostrar/ocultar contraseña
  (extensión reutilizable en `ui-input`/`form-field` vía `conBoton`/slot
  `[accion]`), error de servidor migrado a `<ui-alert>`, mensajes de validación
  diferenciados por tipo de error (requerido vs. formato/longitud).
- **Panel de administrador**: gestión de Cursos y Programas (CRUD + paginación
  + búsqueda), matrícula de estudiantes a curso y a programa. Listado de
  Cursos con filtro combinable por profesor y por programa (antes
  `curso.service.ts` tenía un bug de `if/else if` que impedía mandar ambos
  filtros a la vez). **Usuarios es solo lectura para el admin** (ver punto
  siguiente).
- **Rediseño de los paneles Administrador y Gestor de usuarios (Fase A hecha)**,
  a partir de una referencia de dashboard que pasó el usuario (sidebar oscuro con
  perfil y menú, paneles con gráficos). Se adaptó con la paleta de Cibertec (azul
  marino + azul, no el rosa de la referencia). Un shell compartido
  (`shared/ui/organisms/panel-shell`) reemplaza los layouts: sidebar `--navy` con
  bloque blanco para el logo (el logo real no se lee sobre azul), perfil, menú
  con íconos y "Cerrar sesión"; en ≤ 900 px pasa a barra superior con menú
  desplegable. Nuevas pantallas de **Inicio** para cada rol (`/admin/inicio`,
  `/gestor-usuarios/inicio`) con KPIs y gráficos SVG propios (área, dona, barras;
  sin librerías) alimentados por los listados existentes (`tamano=500`, cálculo en
  el navegador con `core/utils/resumen.util.ts` y `graficos.util.ts`, con tests).
  Rutas del gestor reorganizadas: `inicio`, `usuarios`, `usuarios/nuevo`,
  `usuarios/:usuarioId`. Componentes nuevos: `panel-seccion`, `kpi-tile`,
  `page-header`, `grafico-*`. **Falta la Fase B**: aplicar `page-header`/
  `panel-seccion` y restyle de `data-table` y `ui-modal` en las listas, detalles y
  formularios de usuarios, programas y cursos (y `campo-busqueda`, aún no creado).
  Programas siguen editándose en modal. Si crece la base, conviene un
  endpoint de resumen en el backend en vez de calcular en el navegador.
- **Cursos del administrador: crear/editar en página, no en modal.** A partir de
  la pantalla "Crear curso" de un sistema académico que pasó el usuario (formulario
  en cuadrícula con `*` de obligatorio, Cancelar/Aceptar abajo), nueva
  `pages/admin/curso-form-page` para `/admin/cursos/nuevo` y
  `/admin/cursos/:cursoId/editar` (tres columnas, panel lateral "Después de crear
  el curso"; al guardar abre el curso para seguir con módulos y matrículas). En
  edición el profesor queda bloqueado (el backend no permite cambiarlo) y aparece
  el selector de estado Borrador/Publicado. `cursos-page` ya no tiene modal: usa
  `page-header`, el título es un enlace al curso con el programa debajo, y el
  detalle del curso suma el botón "Editar curso". `form-field`, `select-field` y
  `textarea-field` ganan el input `requerido` (asterisco + texto para lectores de
  pantalla).
- **Datos académicos del curso conectados** (backend ya los expone): `codigo`,
  `periodo` ("AAAA-N"), `cupoMaximo` (null = sin límite), `fechaInicio`,
  `fechaFin` ("yyyy-MM-dd") y `matriculados` (solo lectura). Los cursos viejos
  (ids 1-3 y 11-16) los traen en null y la UI los tolera ("—"). Formulario
  crear/editar con los 5 campos y validación local (período con formato, fin >=
  inicio, cupo entero >= 1 o vacío = null). Los errores del backend se muestran junto
  a su campo: el 400 con `errores` por nombre de campo, y los 409/400 que llegan solo
  como `message` se asocian por texto (`campoDeMensajeCurso`, con tests). En edición
  del PUT el admin debe enviar código/período/fechas: "Publicar/Despublicar" del
  detalle reenvía los campos actuales y, si el curso es antiguo y le faltan, avisa
  que hay que completarlos en «Editar curso» en vez de llamar al backend. Cupo:
  componente `cupo-estado` ("3 / 4", "3 matriculados · sin límite", casi lleno =
  queda 1 lugar, lleno); el botón de matricular se deshabilita con el curso lleno y
  el 409 del backend se muestra dentro del modal (y refresca el curso).
  `curso-datos` (solo lectura) se usa en el detalle de admin, profesor (con cupo) y
  estudiante (sin cupo); `curso-card` muestra código real, período, fechas y cupo
  (profesor). La lista de cursos del admin suma período, fechas y cupo. Las fechas de
  calendario NUNCA pasan por `new Date`: `formatearFechaCalendario` parte el texto
  (en Colombia `new Date('2026-08-03')` daría el 2 de agosto). Modelos del estudiante
  (`ResumenCurso`, `CalificacionesCurso`) con `fechaInicio/fechaFin`; se muestran en
  Calificaciones. Ojo: el panel del profesor no tiene pantalla para editar el curso
  (solo módulos), así que el caso "profesor edita título/descripción" y su 403 no se
  puede dar desde la UI; ve los 5 datos como solo lectura. Pendiente si se quiere:
  `ui-modal` de matrícula y demás pantallas aún con estilo viejo (Fase B).
- **Panel del estudiante con estructura tipo Moodle** (referencia que pasó el
  usuario): header en dos filas (logo, título "Plataforma educativa" y menú de
  usuario; debajo, pestañas), "Mis cursos" con banner, carrusel y tarjetas
  clásicas en 2 columnas × 3 filas, chip de "N actividades pendientes" por
  curso, calendario lateral (`mini-calendario`) con puntos en los días que
  vencen actividades sin entregar y cuestionarios, y footer de Cibertec (logo,
  sedes y correo de soporte; datos en `core/config/contacto.config.ts`,
  compartidos con el login). Los datos vienen de 3 endpoints del backend
  (`core/services/estudiante-avance.service.ts`, `/api/estudiantes/{id}/...`):
  `cursos/resumen` (barra de % completado y chip de pendientes por tarjeta; el
  porcentaje lo calcula el backend, no se recalcula), `vencimientos?desde&hasta`
  (calendario: se pide 1 vez por mes visible con `switchMap` para descartar
  respuestas de un mes anterior; distingue PENDIENTE/VENCIDA/hechas) y
  `calificaciones` (vista nueva `/estudiante/calificaciones`, pestaña
  "Calificaciones" en el header: una sección por curso con puntaje y tabla de
  ítems; un curso 0/0 se muestra como "Sin calificaciones todavía", no 0%). Se
  quitaron los cálculos manuales que hacían decenas de llamadas. Resumen y
  vencimientos son carga no crítica con flags de error propios. Se probó antes
  un diseño con portadas generadas por curso y el usuario prefirió el anterior.
  **Sin verificar contra datos reales**: el servidor local corría código viejo
  (ver "En progreso"). Falta revisar el detalle del curso.
- **Rol nuevo: GESTOR_USUARIOS** — separa la gestión de cuentas del rol
  ADMINISTRADOR (backend actualizado para reflejar esto). El admin conserva
  todo lo académico (programas, cursos, matrículas, contenido) pero perdió
  escritura sobre `/api/usuarios` (el backend responde 403); solo puede ver
  la lista y el detalle de usuarios (`usuario-detalle-page` en modo
  solo-lectura: campos deshabilitados, sin botón Guardar ni tarjeta "Cuenta").
  GESTOR_USUARIOS tiene su propio panel (`gestor-usuarios-layout`, ruta
  `/gestor-usuarios`, sin menú lateral — una sola pantalla) con CRUD completo
  de usuarios, pero solo puede crear cuentas PROFESOR/ESTUDIANTE (el combo de
  rol al crear ya no ofrece ADMINISTRADOR/GESTOR_USUARIOS) y no puede editar/
  eliminar/resetear password de una cuenta ADMINISTRADOR o GESTOR_USUARIOS
  (oculto en la UI, además de que el backend lo rechaza con 403). `UsuariosPage`
  y `UsuarioDetallePage` son componentes **compartidos** entre `/admin/usuarios`
  y `/gestor-usuarios` — deciden su propio modo (lectura vs. edición) leyendo
  `authService.usuarioActual()?.rol` en vez de duplicarse por rol.
- **Admin puede "mirar" (solo lectura) el contenido de un módulo**: en
  `ModuloDetallePage` (admin), además de la gestión completa de Contenidos que
  ya existía, ahora se listan en modo lectura los Bloques, Actividades y
  Cuestionarios del módulo (mismo markup/estilos que la vista de estudiante,
  sin acciones de crear/editar/calificar/responder), y se puede abrir el
  Lienzo del módulo en `[soloLectura]="true"`. El admin **no** autoría
  contenido (no bloques, no lienzo, no actividades, no cuestionarios) — ver
  "Decisiones importantes".
- Tokens de color globales (`--bg`, `--card`, `--border`, `--text-*`,
  `--bright`, `--cyan`, `--danger`, `--button-text`) consolidados en `:root`
  (`src/styles.scss`) en vez de duplicados en cada `:host` de layout. Se sumó
  `--navy: #0c2b6b` (ya existía como valor suelto en `banner-carousel`) como
  acento institucional secundario.
- **Cursos → Módulos**: contenidos (archivo/enlace), y bloques de contenido en
  línea (texto, imagen, video, personaje con diálogo secuencial) con
  arrastrar/soltar, pegado directo de imágenes/texto (Ctrl+V), y reordenamiento.
- **"Contenido personalizable" (lienzo libre)**: editor tipo Canva por módulo,
  con elementos de texto/imagen/video/personaje que se arrastran y redimensionan
  libremente, en **múltiples "hojas"** por módulo (como pestañas). El profesor ve
  pestañas con nombre; el estudiante ve una paginación numérica (1, 2, 3…) abajo.
- **Actividades** (talleres con archivo): entrega de archivo por el estudiante y
  calificación manual por el profesor — funcionalidad preexistente, sin cambios.
- **Cuestionarios** con preguntas de **opción múltiple, verdadero/falso y
  respuesta abierta** (2026-10-14): el profesor elige el tipo al crear la
  pregunta (no se puede cambiar después); el estudiante responde una sola vez.
  Si solo hay cerradas ve su nota y revisión al instante; si hay abiertas, el
  intento queda "en revisión" y no ve nota hasta que el profesor las califique.
  En "Resultados" el profesor ve el estado de cada intento y entra a
  "Calificar" para poner un puntaje entre 0 y el de la pregunta (acepta
  decimales con coma o punto). Soporta ventana de disponibilidad
  (`fechaApertura`/`fechaEntrega`).
- **Programas académicos**: un programa agrupa cursos y tiene su propia
  matrícula de estudiantes (separada de la matrícula a curso individual).
- Panel de profesor: se quitó el botón Publicar/Despublicar del curso, y la
  pestaña "Participantes" ya no muestra la barra de navegación de módulos
  (solo la tabla).
- **Tabla de Usuarios (admin)** rediseñada: columna única "Usuario" con avatar
  de iniciales + nombre/correo apilados (mismo patrón visual que el avatar del
  header), y acciones con un botón principal ("Editar") más dos enlaces
  livianos ("Resetear contraseña"/"Eliminar") en vez de 3 botones iguales. La
  tabla genérica (`data-table`) ahora soporta celdas con contenido custom vía
  `<ng-template dataTableCell="clave">` (content projection), sin romper los
  usos existentes que siguen mostrando texto/badge plano.
- Se pasó una revisión de PR (3 agentes: code-reviewer, type-design-analyzer,
  silent-failure-hunter) sobre el feature de Cuestionarios y se corrigieron
  todos los hallazgos críticos/importantes — ver "Decisiones importantes".

## En progreso

Los tipos de pregunta, la nota sobre 5 / `mostrarNota`, responder de a una
pregunta, la ficha del gestor y los arreglos de foco/Escape/decimales/375 px
quedaron **verificados en el navegador** el 2026-10-21 (ver log). Sigue sin probarse el CRUD completo del rol
GESTOR_USUARIOS (crear/editar/eliminar un profesor o estudiante e intentar
tocar una cuenta admin para confirmar el bloqueo).

## Pendiente / próximos pasos

- **Backend**: confirmar que `fechaApertura`, `fechaEntrega`,
  `tiempoLimiteMinutos` y el campo calculado `disponible` de Cuestionario se
  persistan y devuelvan de verdad (a la fecha de esta entrada, el backend los
  acepta en el request pero los ignora silenciosamente en la respuesta). El
  frontend ya trata `disponible` ausente/null como "disponible" (fail-open)
  para no bloquear cuestionarios mientras esto se resuelve.
- Manijas de redimensionar en las 4 esquinas/lados del lienzo (hoy solo hay una,
  inferior derecha).
- Panel de estilo de texto en el lienzo (fuente, tamaño, color, alineación).
- Formulario de "editar curso" para el **profesor** — hoy solo existe en el
  panel de admin; el profesor no tiene forma de cambiar título/descripción de
  su propio curso.
- Revisar un "Failed to fetch" puntual visto una vez en la pestaña
  Participantes del profesor — no se pudo reproducir de forma consistente.
- Accesibilidad y responsive: deuda pendiente general (detalle en `CLAUDE.md`).
- Cuestionarios: `tiempoLimiteMinutos` no tiene cronómetro ni se hace cumplir
  (falta decisión de producto). El resto de la deuda de la revisión de PR se
  cerró el 2026-09-30 (ver log).
- **Probar en el navegador** lo del 2026-09-30: formulario de pregunta del
  profesor (errores por campo, quitar la opción marcada como correcta), chips
  "Respondido / Sin responder" del estudiante (hace 1 llamada a `mi-intento`
  por cuestionario — si un curso tiene muchos, conviene que el backend mande
  el estado en el listado), y Escape/foco en ambos overlays.
- Escape + devolución de foco: hecho en los overlays de cuestionario y en
  `ui-modal` (2026-10-21, cubre todos los modales y `confirm-dialog`); falta en `lienzo`.
- **Páginas: API verificada, falta el navegador.** El 2026-09-30 se probaron
  con llamadas directas todos los endpoints que usa el frontend (curso 31 /
  módulo 19, profesor `marco.aguilar@cibertec.test`, estudiante
  `camila.torres@cibertec.test`, admin `admin@cibertec.com` / `Admin123!`;
  el resto de las cuentas de simulación usa `Sim12345!`): crear, validaciones
  400 de título, texto con acentos, imagen, reordenar bloques y páginas
  (persiste), orden incompleto → 400, editar y borrar bloque, bloques de página
  fuera de los sueltos del módulo, estudiante y admin leen (200) pero no
  escriben (403), borrar página → 404 después. Todo lo creado se borró. Falta
  recorrer la UI en el navegador (incluido mobile).

## Integración con backend

- **URL base**: sale de `src/environments/` (desarrollo: `http://localhost:8080/api`;
  producción: variable `API_BASE_URL` del hosting, que `npm run build:produccion`
  escribe sobre el marcador `__API_BASE_URL__`). `core/config/api.config.ts` la
  reexporta como `API_BASE_URL`. Detalle de cómo publicar en `README.md`.
- **CORS del backend**: hoy solo permite `http://localhost:4200`
  (`SecurityConfig.java`). Para publicar hay que sumar el dominio del front.
- **Auth**: JWT guardado en `localStorage`, adjuntado por
  `core/interceptors/auth.interceptor.ts`.
- La lista completa y actualizada de endpoints está en el código
  (`core/services/*.ts`) — no se duplica acá para no desactualizarse.
- **Nota de contexto importante**: en la sesión del 2026-09-14, tres features
  nuevas (lienzo multi-hoja, programas, cuestionarios) pasaron por un período
  donde el backend devolvía 500 genérico o ignoraba campos nuevos en silencio,
  a pesar de reportarse como "ya implementado y probado". Antes de asumir que
  un endpoint nuevo funciona, conviene probarlo con una llamada directa
  (curl/fetch) además de por la UI.

## Decisiones de diseño

- Estilo visual inspirado en Facebook (login y paneles): azul de acento
  `--bright: #1877f2`, textos en grises (`--text-primary #1c1e21`,
  `--text-secondary #606770`, `--text-muted #90949c`), bordes `--border
  #dddfe2`, tarjetas blancas (`--card #ffffff`) sobre fondo gris claro.
- Tipografía: system font stack, sin fuente custom.
- Esquinas redondeadas (8–14px) y sombras suaves en modales/overlays.
- El contenido rico (lienzo, cuestionario) usa **overlays a pantalla completa**
  en vez de modales chicos, para tener espacio de edición cómodo.

## Decisiones importantes

- **Módulos anidados (pedido del usuario, 2026-09-30, con capturas de un
  Moodle de referencia)**: NO es un nivel fijo "Corte" (se propuso una
  entidad Sección y el usuario la corrigió). Es que **un módulo puede tener
  submódulos**: "Primer Corte" es un módulo común con hijos "Inicio",
  "Semana 1", "Semana 2 - 3", "Evaluación"…; los nombres los elige el
  profesor. Un nivel de anidamiento (padre → hijos); padre e hijos pueden
  tener su propio contenido. UI: módulos raíz = pestañas (General | Primer
  Corte | …), hijos = sub-pestañas, navegación lateral en árbol. "General"
  es un módulo raíz más, con la presentación del profesor (perfil, lo carga
  el profesor) y los datos del curso (los carga el admin). Requiere backend
  (`moduloPadreId`): prompt entregado al usuario. Hasta que exista, los
  módulos siguen en una lista plana.

- **Standalone components** en todo el proyecto — sin NgModules.
- **Signals** para estado local de componente — no se usa NgRx ni un store
  global.
- Nombres de variables/métodos/archivos **en español**, siguiendo el idioma
  del dominio (curso, matrícula, cuestionario, etc.) — no mezclar inglés.
- El **lienzo es multi-hoja** por módulo (no un canvas único) porque un módulo
  puede tener mucho contenido variado y no todo cabe en una sola pantalla.
- **Cuestionario es un tipo de evaluación separado de Actividad**: Actividad
  sigue siendo para talleres con archivo y calificación manual; Cuestionario es
  opción múltiple con autocalificación. No se mezclaron ambos conceptos.
- **Seguridad en Cuestionario**: el campo `esCorrecta` de las opciones se oculta
  por completo (no solo en el frontend) para un estudiante que todavía no
  respondió, para que no se pueda ver la respuesta correcta inspeccionando la
  red.
- **Resiliencia de carga con error visible**: llamadas a features "opcionales"
  dentro de una pantalla más grande (ej. cuestionarios al cargar un módulo) se
  envuelven en `catchError`, pero el error se loguea y se expone con un flag
  (`cuestionariosError`) para mostrar un mensaje distinto de "no se pudo
  cargar" — un `catchError(() => of([]))` sin esto es indistinguible de una
  lista genuinamente vacía y puede esconder un 401/403/500 real (aplicar este
  mismo patrón a cualquier carga "no crítica" nueva).
- **Campos booleanos calculados por el backend que pueden faltar** (ej.
  `disponible` en Cuestionario) se tipan `boolean | null | undefined` y se
  tratan como **fail-open** (ausente/null = permitido) en vez de fail-closed,
  para que un backend que todavía no manda el campo no bloquee la
  funcionalidad para todos los usuarios.
- **El admin NO es un autor de contenido, es superusuario de gestión**:
  decisión explícita del usuario (2026-09-16) tras auditar el panel admin
  contra el spec completo del backend. El admin crea/edita programas, cursos
  (asigna profesor/programa) y matrículas, pero **no** crea/edita bloques,
  lienzo, actividades ni cuestionarios — de eso se encarga exclusivamente el
  profesor dueño del curso. El admin solo puede **ver** ese contenido
  (solo-lectura) para supervisión. Si en el futuro se pide "que el admin
  también pueda editar X", confirmar con el usuario antes de asumirlo — no es
  el criterio por defecto aunque el backend lo permita a nivel de permisos.
- **Reutilización de la vista de estudiante como base de "solo lectura"**: la
  página de curso del estudiante (`EstudianteCursoDetallePage`) ya era, en
  esencia, una vista de solo-mirar de bloques/actividades/cuestionarios/lienzo
  — se usó su mismo markup/CSS (despojado de las partes interactivas de
  entrega/responder) para la nueva sección de solo-lectura del admin, en vez
  de inventar un patrón visual nuevo.
- **GESTOR_USUARIOS separa "administrar cuentas" de "administrar academia"**:
  decisión explícita del usuario (2026-09-16), coordinada con un cambio de
  backend. En vez de duplicar `UsuariosPage`/`UsuarioDetallePage` por rol, se
  optó por componentes compartidos que leen `authService.usuarioActual()?.rol`
  para decidir su propio modo (lectura vs. edición) — mismo criterio que ya se
  usa en `ModuloDetallePage`. Restricción de seguridad importante: ni siquiera
  GESTOR_USUARIOS puede crear/editar/eliminar cuentas ADMINISTRADOR o
  GESTOR_USUARIOS (ni desde la UI ni el backend lo permite) — evitar
  "arreglar" esto quitando la restricción sin confirmar con el usuario, es
  intencional contra escalamiento de privilegios.

## Log de sesiones

### 2026-10-21
- Revisión antes de entregar: lo de la nota sobre 5 / `mostrarNota` /
  responder de a una pregunta estaba completo contra el contrato del backend
  (nada a medias); se commiteó en `feature/cuestionarios-nota-visible`.
- Preparación para desplegar: `ng generate environments`;
  `environment.development.ts` = localhost, `environment.ts` (producción) =
  marcador `__API_BASE_URL__` que reemplaza `scripts/configurar-api.mjs` con la
  variable `API_BASE_URL` (falla si falta o no empieza con http(s), avisa si es
  http no local). `npm run build:produccion` = script + `ng build`. Si alguien
  compila sin el script, `api.config.ts` deja un error claro en consola.
  `vercel.json`, `netlify.toml` y `public/_redirects` con la redirección SPA.
  Probado: sin variable falla, URL inválida falla, con variable el bundle lleva
  la URL, y el build de desarrollo lleva localhost.
- README de Angular reemplazado por uno real (qué es, roles, requisitos, correr
  en local, otro backend, publicar, tests).
- El recorrido en el navegador lo hizo Claude en Chrome (esta sesión no tenía
  herramientas de navegador).
- **Recorrido en el navegador (Claude en Chrome)**: A–H del prompt de prueba
  (gestor, crear cuestionario de 3 tipos con la casilla apagada, responder de
  a una pregunta, calificar con validación, "Nota no publicada", activar la
  casilla, teclado, 375 px y borrado). 9 ✅ / 4 ❌. Corregido:
  - **Decimales**: `formatearPuntaje` ahora usa coma ("3,5"), igual que la
    nota sobre 5; el campo de puntaje de la revisión también se llena con coma.
  - **Foco**: `ui-modal` mueve el foco adentro al abrirse (primer control del
    cuerpo; en `confirm-dialog` es "Cancelar"), cierra con Escape y devuelve
    el foco al cerrar (ahora con rol `dialog` y `aria-labelledby`).
    `cuestionario-editor`: foco a "← Volver a resultados" al abrir la
    revisión, al botón de la fila (`data-intento`) al volver, al campo de
    puntaje después de calificar, y al enunciado (con scroll) al editar una
    pregunta. `cuestionario-responder`: foco al mensaje del resultado al
    finalizar.
  - **Escape durante "Abriendo intento…"**: cancela la petición y se queda en
    Resultados (antes cerraba todo el overlay).
  - **Cerrar el editor ya no recarga el curso entero**: solo pide los
    cuestionarios de ese módulo y devuelve el foco a "Preguntas y resultados"
    (antes ~7 llamadas por módulo, "Cargando…" de 5-8 s y foco en `BODY`).
  - **375 px**: la cabecera del editor se apila y el overlay ocupa toda la
    pantalla. La tabla de Resultados sigue con scroll horizontal dentro de
    su contenedor (no desborda la página).
  - Menores: "Te falta 1 pregunta" (singular), la tarjeta "Cuestionario" del
    selector de recursos ya no dice "solo opción múltiple", y el 403
    esperado del gestor no se loguea como error en consola.
- No corregido (anotado): el recorrido vio ~30 de 54 peticiones con **503**
  al recargar el curso después de guardar; el backend no devuelve 503 en
  ningún lado de su código y una ráfaga de 40 peticiones en paralelo con
  curl dio 40 × 200, así que no se pudo reproducir ni atribuir. Guardar en
  otras partes del curso sigue recargando la página completa (5-8 s). Las
  respuestas a medio contestar no se guardan si el estudiante recarga
  (sería una feature nueva). `.course-main` desborda 8 px a 375 px (ya
  estaba en la lista de pendientes de responsive).
- **Re-verificación en el navegador de los arreglos: 6/6 ✅** (coma en todos
  los puntajes, foco en cada paso del profesor y del estudiante, Escape durante
  "Abriendo intento…", cabecera a 375 px, scroll al editar y "Te falta 1
  pregunta"). Cerrar el editor ya no muestra "Cargando…". Se borró "PRUEBA
  reverif". Los 375 px se probaron en un iframe de ese ancho, no con
  emulación de dispositivo.
- Para avisar al backend (sin tocarlo): CORS solo acepta
  `http://localhost:4200`; al publicar hay que sumar el dominio del front, y
  el backend tiene que estar en HTTPS.

### 2026-10-16
- Rama `feature/cuestionarios-nota-visible` (desde `master`, que ya tenía los
  commits del 2026-10-14). Conecta el contrato del backend "Nota sobre 5 y
  nota visible a criterio del profesor" (`940c059` del repo backend).
- **Nota sobre 5,0 en todo el front**: la calcula el backend (`notaSobre5`);
  el front solo la formatea con `formatearNotaSobre5` ("4,2", siempre un
  decimal y coma) y muestra los puntos al lado como detalle ("4,2 / 5,0 · 2,5
  de 3 pts"). Lugares: Resultados y revisión del profesor, entregas de
  actividad (profesor y estudiante), chip del cuestionario, resultado al
  finalizar y Calificaciones (por ítem y total del curso; el "% de lo
  calificado" se reemplazó por los puntos y se borró `porcentajePuntaje`,
  que quedó sin uso). El puntaje que escribe el profesor al calificar sigue
  en puntos.
- **`mostrarNota`**: casilla "Mostrar la nota al estudiante cuando finalice"
  en el modal de crear/editar cuestionario, **apagada por defecto en los
  nuevos** (pedido del usuario: la nota se ve solo si el profesor lo
  habilita) y editable después. `resultadoIntentoEstudiante()`
  (`visible | en-revision | oculta`, con tests) decide qué ve el estudiante:
  como el intento no trae `mostrarNota`, "oculta" se deduce de `preguntas`
  vacía (un intento enviado siempre tiene preguntas). Chip nuevo "Enviado"
  y botón "Ver envío"; en Calificaciones, un cuestionario `RENDIDO` sin nota
  dice "Nota no publicada". En la revisión del profesor se indica si el
  estudiante ya ve la nota (`notaVisible`).
- **Responder una pregunta por pantalla** (`cuestionario-responder`):
  "Pregunta N de M", grilla de números para saltar a cualquiera (marca las
  respondidas por fondo y no solo por color, `aria-current`, `aria-label`
  con el estado), Anterior/Siguiente y "Finalizar" en la última, deshabilitado
  con el aviso "Te faltan N preguntas" hasta responder todas. Al cambiar de
  pregunta el foco va al enunciado. En ≤ 480 px el overlay ocupa toda la
  pantalla. Lógica de "respondida" en `estaRespondida()` con tests.
- Verificado contra la API (curso 31, módulo 37, "PRUEBA nota visible", 2
  preguntas, `mostrarNota: false`): enviar → `preguntas: []`, nota null;
  Calificaciones `ENTREGADA` sin nota; calificar 0.5 → el profesor ve 2.5 y
  4.2, el estudiante sigue sin verla y Calificaciones pasa a `RENDIDO` sin
  nota; PUT con `mostrarNota: true` (mismo body que el formulario) → el
  estudiante ve 2.5 / 4.2. Se borró todo (intento 404). Falta lo visual.

### 2026-10-14
- Revisión del alcance contra el plan de práctica (UNIMINUTO): el proyecto es un
  MVP, no una réplica de Moodle. Decisión del usuario: cerrar primero lo que
  falta del plan (tipos de pregunta, bugs conocidos, despliegue, pruebas con
  usuarios, manuales) y pulir después.
- Cuestionarios: soporte de verdadero/falso y respuesta abierta (backend en el
  commit hermano del repo backend). `cuestionario-editor` suma selector de
  tipo, vista de V/F con dos opciones fijas, y una vista de revisión de
  intentos dentro de "Resultados" para calificar abiertas.
  `cuestionario-responder` suma el cuadro de texto, la nota "pendiente" y el
  puntaje por abierta. Funciones puras nuevas en `cuestionario.util.ts`
  (`leerPuntaje`, estado `en-revision`) con tests.
- Bugs del recorrido del gestor, **corregidos** en `usuario-detalle-page`:
  - Estudiante: las 4 llamadas de `cargarPertenencia()` tienen cada una su
    `catchError`. El 403 del backend al GESTOR_USUARIOS en
    `/matriculas/estudiante/{id}` y `/matriculas-programa/estudiante/{id}` (a
    propósito, no se tocaron permisos) ya no tumba la sección: cada columna
    muestra su aviso ("Tu rol no tiene permiso para ver…", en gris; otros
    errores en rojo). Si fallan los listados de nombres, se muestra
    "Curso #id"/"Programa #id". Verificado con curl: gestor → 403 en las dos de
    matrículas, 200 en `/cursos` y `/programas`.
  - Profesor: los programas se derivan de sus cursos con
    `programasDeCursos()` (`core/utils/curso.util.ts`, sin repetir, ordenado,
    con tests). No pide nada nuevo al backend.
- Tipos de pregunta **verificados contra la API** (no en el navegador: la
  sesión no tenía control del navegador). Con `marco.aguilar`/`camila.torres`,
  curso 31, módulo 37: cuestionario "PRUEBA tipos" con OM, V/F y abierta (201),
  cambiar el tipo → 409, editar V/F → 200, el estudiante no recibe
  `esCorrecta`, enviar → `PENDIENTE_REVISION` con `nota` null, Calificaciones
  → `ENTREGADA` sin nota, calificar 2 sobre 1 → 409, -1 → 400, 0.5 → 200 y el
  intento pasa a `CALIFICADO` (2,5/4), el estudiante ve la nota y
  Calificaciones → `RENDIDO`. Todo coincide con lo que espera el código del
  front. Se borró el cuestionario (intento incluido, 404 después).
- Bug corregido en `cuestionario-editor`: con un puntaje fuera de rango
  "Calificar" se deshabilitaba pero el mensaje de error nunca se mostraba.
  Ahora aparece debajo del campo (con `role="alert"` y `aria-describedby`),
  solo cuando hay algo escrito.
- Endpoints del estudiante verificados (pendiente desde el 2026-09-18):
  `cursos/resumen`, `vencimientos` y `calificaciones` responden 200 con los
  valores esperados (camila.rojas 44 %, andres.pardo 22 % y 19/30,
  valentina.cruz 0 % y 0/0; el curso borrador 19 no aparece).
- `fechaApertura`, `fechaEntrega` y `tiempoLimiteMinutos` no vienen en la
  respuesta del cuestionario cuando son null: **no es un bug**,
  `CuestionarioResponseDTO` tiene `@JsonInclude(NON_NULL)`. El front los tipa
  `| null` y lo tolera.
- **Bug encontrado en el navegador (Claude en Chrome)**: en Resultados la
  columna Estado mostraba `PENDIENTE_REVISION` crudo y no aparecía el botón
  "Calificar" → el profesor no podía calificar abiertas desde la UI.
  Causa: `cuestionario-editor` usaba `<ng-template dataTableCell>` sin
  importar `DataTableCellDirective`; Angular lo ignora sin error y la tabla
  cae al texto plano. Mismo bug en `admin/cursos-page` (título-enlace,
  fechas y cupo no se veían). Corregido en los dos. **Ojo al usar
  `dataTableCell`: importar siempre `DataTableCellDirective` junto con
  `DataTable`** — ni el build ni los tests lo detectan. Las pruebas por API
  no podían encontrarlo: confirma que la verificación visual sigue haciendo
  falta.
- Pedido del usuario para después (no implementado todavía): notas en escala
  0,0–5,0 calculadas por el **backend** (`notaSobre5`, sin dejar de guardar
  puntos), opción del profesor `mostrarNota` (si está apagada, al finalizar
  el estudiante solo ve una confirmación; se puede encender después) y
  responder **una pregunta por pantalla** con Anterior/Siguiente, grilla de
  números y "Finalizar". Se le entregó al usuario el prompt del backend.
  → Implementado el 2026-10-16 (ver log de ese día).

### 2026-09-30
- Backend apagado: no se pudieron verificar los endpoints del estudiante (sigue
  en "En progreso").
- Cierre de la deuda de Cuestionarios: el formulario de pregunta de
  `cuestionario-editor` pasó a ReactiveForms (`FormArray` de opciones,
  `textarea-field`/`form-field`, errores por campo, validador de grupo
  `correctaValidator`). Los resultados se vuelven a pedir cada vez que se
  entra a la pestaña (se quitó `resultadosCargados`). La lista del estudiante
  muestra "Respondido: nota / máx", "Sin responder" o "No disponible"
  (consulta `mi-intento` por cuestionario como carga no crítica), y al enviar
  el overlay emite `respondido` para actualizar el chip sin recargar.
- Accesibilidad en `cuestionario-editor` y `cuestionario-responder`:
  `role="dialog"`, Escape cierra (salvo que haya un confirm-dialog encima), el
  foco va al botón Cerrar al abrir y vuelve al disparador al cerrar.
- Lógica pura en `core/utils/cuestionario.util.ts` con tests (91 tests en verde).
- A pedido del usuario, la tarjeta de módulo del profesor pasó a un **selector
  único "Agregar actividad o recurso"** (estilo Moodle): un botón al pie de
  cada módulo abre `shared/ui/organisms/agregar-recurso-selector` con
  Actividades (actividad con archivo, cuestionario) y Recursos (texto, imagen,
  video, archivo, personaje, contenido personalizable); cada opción abre el
  flujo de creación que ya existía. Se quitaron los botones sueltos
  ("+ Agregar contenido", "Nueva actividad", "Nuevo cuestionario", "Abrir
  editor") y los "Sin X todavía": cada sección solo aparece si tiene algo, y
  un módulo vacío muestra un único mensaje. El pegado/arrastre de archivos en
  la zona del módulo sigue igual. Después, también a pedido del usuario:
  "Texto" se escribe **en línea** dentro del módulo (textarea al final de los
  bloques, con foco y scroll automáticos, Escape cancela) en vez de en un
  modal, y el modal de bloques ya no tiene pestañas de tipo — abre directo en
  el tipo elegido con título propio ("Agregar video", etc.). Sin probar en el
  navegador todavía.
- **Recurso "Página" de los módulos** (backend nuevo, ver prompt del usuario):
  un módulo tiene varias páginas con título y bloques apilados, como la
  Página de Moodle. El lienzo sigue siendo otro recurso aparte.
  - Modelo `PaginaModulo` (`core/models/pagina-modulo.model.ts`) y
    `PaginaModuloService`. Se llamó así para no chocar con `pagina.model.ts`,
    que es la paginación de listados (`PaginaResponse<T>`).
  - `Bloque` suma `paginaId`; `BloqueService` recibe un `ContenedorBloques`
    (`{tipo:'modulo'|'pagina', id}`) en vez de duplicar métodos.
  - **PERSONAJE eliminado de los bloques** (decisión del usuario): el backend
    nunca tuvo ese tipo (`crearPersonaje` llamaba un endpoint inexistente).
    El personaje sigue existiendo dentro del lienzo.
  - Componentes nuevos: `shared/ui/molecules/bloque-vista` (lectura de un
    bloque; las imágenes se muestran inline pidiendo la URL firmada de 15 min
    al renderizar) y `shared/ui/organisms/bloques-editor` (editor controlado:
    pegar/arrastrar, texto en línea, modal de video/imagen/archivo, editar,
    borrar, reordenar arrastrando o con ↑/↓ accesibles por teclado). Toda esa
    lógica salió de `profesor/curso-detalle-page`, que bajó mucho de tamaño.
  - Profesor: "Página" en el selector de recursos (modal de título → crea y
    abre), sección "Páginas" por módulo (renombrar, eliminar, ↑/↓), páginas en
    la navegación lateral (📄; las hojas del lienzo pasan a 🎨).
  - Vista `pages/pagina-modulo-page`, **compartida por los 3 paneles** según
    `data.panel` de la ruta (profesor edita; estudiante/admin leen), con
    "← Anterior / Siguiente →" entre las páginas del módulo. Rutas:
    `/profesor/cursos/:cursoId/paginas/:paginaId`,
    `/estudiante/cursos/:cursoId/paginas/:paginaId`,
    `/admin/cursos/:cursoId/modulos/:moduloId/paginas/:paginaId`.
  - Tests: `core/utils/orden.util.ts` (`moverElemento`, `vecinos`).
- **Submódulos** (backend listo; spec pegada por el usuario): `Modulo` suma
  `moduloPadreId` (un nivel). `GET /cursos/{id}/modulos` sigue plano; se
  agrupa con `core/utils/modulo-arbol.util.ts` (`armarArbolModulos`,
  `aplanarArbol`, `idsDelGrupo`, `moverModulo`, con tests).
  `ModuloService.reordenar(cursoId, padreId, ids)` = PATCH de un grupo
  completo de hermanos. **`ModuloRequest.moduloPadreId` es obligatorio en el
  tipo a propósito**: un PUT sin ese campo mueve el módulo a la raíz; así el
  compilador marcó el "Editar módulo" del admin, que ahora conserva el padre.
  - Profesor: árbol colapsable (submódulos con sangría bajo su padre, "N
    submódulos de «X» ▾"), botón "+ Submódulo" en cada raíz, select "Módulo
    padre" en el modal (bloqueado si el módulo ya tiene hijos; el campo
    numérico "Orden" se quitó: el orden se calcula solo). Mover arrastrando la
    cabecera: soltar sobre otra cabecera = queda antes de ella (reordena o
    cambia de padre), zona "Suelta aquí para moverlo dentro de «X»", zona
    "…módulo principal (al final)"; también ↑/↓ entre hermanos. Optimista:
    PATCH si no cambia el padre, PUT + PATCH si cambia; con error se revierte
    y se muestra el `message` del backend tal cual. Los `ng-template` de
    tarjeta/nav tienen contexto tipado (`ngTemplateContextGuard`) para no
    caer en `any`.
  - Estudiante y admin: orden de árbol, submódulos con sangría; el número que
    se muestra es la posición entre hermanos (el backend numera desde 0
    después de un PATCH).
  - Verificado contra el backend (curso 31, Marco): crear padre, mover
    adentro, reordenar, volver a raíz, los 3 mensajes de 400 y orden
    incompleto → 400; las páginas del módulo movido siguen. Se dejó el curso
    como estaba. Falta probar el arrastre en el navegador.
- **Vista del estudiante con pestañas tipo Moodle** (el usuario comparó con
  capturas de su Moodle y la lista larga "no tenía nada que ver"): nuevo
  `shared/ui/organisms/modulo-pestanas` (fila de módulos raíz con ⌄ si tienen
  hijos + fila de submódulos; si el raíz tiene contenido propio aparece como
  sub-pestaña "Inicio"). Se muestra **un módulo a la vez**; la presentación
  del curso va dentro de la **primera pestaña** (el "General" de Moodle), no
  arriba de todo. La pestaña elegida queda en el fragmento `#modulo-X` para
  volver a ella (ej. desde una página). La navegación lateral es un árbol y
  el título del módulo elige la pestaña.
  - Datos de ejemplo en el curso 31: "Modulo" renombrado a "General"; Primer
    Corte (Inicio, Semana 1 — Introducción a Angular, Semana 2 - 3,
    Evaluación), Segundo Corte (Inicio), Tercer Corte (Inicio).
  - Pendiente: aplicar las mismas pestañas a la vista del profesor (hoy usa
    el árbol editable de la spec) y del admin, si el usuario lo quiere.

### 2026-09-16
- Rediseño del login: carrusel de fotos + logo real + toggle de contraseña +
  `ui-alert` para error de servidor + mensajes de validación diferenciados,
  iterado varias rondas con el usuario (posición del logo, tamaño, fondo).
  Extensión reutilizable de `ui-input`/`form-field` (`conBoton` + slot
  `[accion]`) para soportar el botón de mostrar/ocultar contraseña en
  cualquier campo del proyecto, no solo login.
- Consolidación de tokens de color globales duplicados en 4 archivos a un
  único `:root` en `src/styles.scss`, sumando `--navy` como acento secundario.
- El usuario pasó el spec completo del backend del LMS y pidió auditar todo
  el panel admin contra ese spec (3 agentes en paralelo). Hallazgo principal:
  Bloques, Lienzo, Actividades+Entregas y Cuestionarios estaban 0%
  implementados en admin (solo en el panel de profesor); Usuarios/Programas/
  Cursos ya tenían su CRUD casi completo, con un bug de filtros en Cursos.
- Tras aclarar el alcance real con el usuario (ver "El admin NO es un autor
  de contenido" en Decisiones importantes), se implementó: vista de
  solo-lectura de Bloques/Actividades/Cuestionarios/Lienzo en
  `ModuloDetallePage` (admin), reutilizando el patrón de
  `EstudianteCursoDetallePage`; fix del bug `if/else if` en
  `curso.service.ts`; filtro por profesor/programa en el listado de Cursos.
- Se reemplazó el modal de "Editar usuario" por una página completa
  (`usuario-detalle-page`, ruta `/admin/usuarios/:usuarioId`) — el usuario no
  quería un "desplegable" para editar. Esa página también agrupa Resetear
  contraseña/Eliminar (antes sueltos en la fila de la tabla) y una sección de
  "Cursos y programas" a los que pertenece el usuario (cruza matrículas contra
  los listados de cursos/programas para mostrar nombres, no solo IDs). Rol
  quedó como campo fijo (no editable) tras la creación, por pedido explícito
  del usuario.
- El usuario pidió separar la gestión de cuentas del admin en un rol nuevo;
  se le armó un prompt para coordinar el cambio de backend (agregar rol
  GESTOR_USUARIOS, mover los permisos de escritura de `/api/usuarios` a ese
  rol). Una vez confirmado el backend, se implementó el lado frontend: guard
  nuevo, panel nuevo (`gestor-usuarios-layout`, sin menú), y `UsuariosPage`/
  `UsuarioDetallePage` compartidos entre admin (solo lectura) y gestor
  (edición, con restricción para no tocar cuentas ADMINISTRADOR/GESTOR_USUARIOS)
  — ver "GESTOR_USUARIOS separa..." en Decisiones importantes.
- Pendiente para la próxima sesión: el usuario todavía no probó en el
  navegador el flujo completo de GESTOR_USUARIOS (login, crear/editar/eliminar
  un profesor o estudiante, e intentar tocar una cuenta admin para confirmar
  que queda bloqueado) — ver "En progreso".

### 2026-09-14 (parte 2)
- Rediseño de la tabla de Usuarios del panel de administrador: avatar +
  identidad apilada, acciones con jerarquía visual (un botón principal, dos
  enlaces livianos). `data-table` ganó soporte de content projection por
  columna sin romper compatibilidad con los usos existentes.
- Revisión de PR de 3 agentes sobre el commit de Cuestionarios; se corrigieron
  todos los hallazgos críticos e importantes (ver "Decisiones importantes" y
  "Pendiente" para el detalle de lo corregido vs. lo diferido).

### 2026-09-14
- Se implementaron 3 features grandes: "Contenido personalizable" (lienzo libre
  multi-hoja, personajes, pegado de imágenes/texto), "Programa" académico (CRUD
  admin + matrícula), y "Cuestionario" (quiz autocalificado con ventana de
  disponibilidad).
- Se corrigieron bugs de superposición de elementos nuevos y de parpadeo de
  video en el lienzo (pipe puro para sanitizar URLs de YouTube).
- Se limpió la UI del profesor: se quitó el botón Publicar y la navegación
  sobrante en la pestaña Participantes.
- Se detectaron y reportaron 3 casos de backend que fallaba o ignoraba campos
  en endpoints recién anunciados como "listos" — verificar siempre con una
  llamada directa antes de asumir que un endpoint nuevo funciona.
- Se configuraron `CLAUDE.md` (criterios de desarrollo senior Angular) y este
  mismo `HISTORIAL.md`.

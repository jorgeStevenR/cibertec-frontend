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
- **Cuestionarios** (quiz de opción múltiple autocalificado): el profesor arma
  preguntas con opciones marcando la correcta; el estudiante responde una sola
  vez y ve su nota y revisión al instante; el profesor ve una tabla de
  resultados. Soporta ventana de disponibilidad (`fechaApertura`/`fechaEntrega`)
  — ver "Pendiente", el backend todavía no persiste esos 2 campos.
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

Nada a medio terminar en este momento — punto de corte limpio. El rol
GESTOR_USUARIOS (guard, panel nuevo, `UsuariosPage`/`UsuarioDetallePage`
compartidos con modo lectura/edición según rol) está implementado y
compila/testea en verde, pero **todavía no fue probado en el navegador**
(login como GESTOR_USUARIOS, CRUD de profesor/estudiante, e intentar tocar
una cuenta admin para confirmar que el bloqueo funciona) — confirmar en la
próxima sesión antes de dar por cerrado.

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
- Deuda menor detectada en la revisión de PR de Cuestionarios (no bloqueante):
  el formulario de pregunta en `cuestionario-editor` todavía no usa
  ReactiveForms; `tiempoLimiteMinutos` no tiene cronómetro ni se hace cumplir
  (falta decisión de producto); `resultadosCargados` nunca se resetea; falta
  indicador de "ya respondido" en la lista de cuestionarios del estudiante;
  `cerrarCuestionario()` no recarga tras enviar; sin tests unitarios todavía.

## Integración con backend

- **URL base**: `http://localhost:8080/api` (`src/app/core/config/api.config.ts`).
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

# Historial del proyecto — Cibertec Frontend

> Este archivo es el punto de partida de cualquier sesión nueva (ver `CLAUDE.md`).
> "Estado actual" y "Pendiente" son una **foto del momento** — se reescriben en
> cada actualización, no se les va agregando texto indefinidamente. El único
> apartado que crece con el tiempo es el "Log de sesiones".

## Resumen del proyecto

Frontend Angular (standalone components + signals) de una plataforma educativa
tipo Moodle, con tres paneles — Administrador, Profesor y Estudiante — que
consumen una API REST propia (backend aparte, no incluido en este repo).

## Estado actual

- **Login** y guards por rol (admin/profesor/estudiante).
- **Panel de administrador**: gestión de Usuarios, Cursos y Programas (CRUD +
  paginación + búsqueda), matrícula de estudiantes a curso y a programa.
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

## En progreso

Nada a medio terminar en este momento — punto de corte limpio.

## Pendiente / próximos pasos

- **Backend**: confirmar que `fechaApertura`, `fechaEntrega`,
  `tiempoLimiteMinutos` y el campo calculado `disponible` de Cuestionario se
  persistan y devuelvan de verdad (a la fecha de esta entrada, el backend los
  acepta en el request pero los ignora silenciosamente en la respuesta).
- Manijas de redimensionar en las 4 esquinas/lados del lienzo (hoy solo hay una,
  inferior derecha).
- Panel de estilo de texto en el lienzo (fuente, tamaño, color, alineación).
- Formulario de "editar curso" para el **profesor** — hoy solo existe en el
  panel de admin; el profesor no tiene forma de cambiar título/descripción de
  su propio curso.
- Revisar un "Failed to fetch" puntual visto una vez en la pestaña
  Participantes del profesor — no se pudo reproducir de forma consistente.
- Accesibilidad y responsive: deuda pendiente general (detalle en `CLAUDE.md`).

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
- **Resiliencia de carga**: llamadas a features "opcionales" dentro de una
  pantalla más grande (ej. cuestionarios al cargar un módulo) se envuelven en
  `catchError` para que un endpoint roto no tumbe toda la pantalla.

## Log de sesiones

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

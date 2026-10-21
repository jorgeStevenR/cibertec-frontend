# Cibertec Frontend — Guía para Claude Code

Frontend Angular (standalone components + signals) de una plataforma tipo Moodle:
paneles de Administrador, Profesor y Estudiante consumiendo un backend REST en
`http://localhost:8080/api` en desarrollo (la URL sale de `src/environments/`; ver README.md).

**Antes de empezar a trabajar, leé `HISTORIAL.md`** (raíz del proyecto) para saber
en qué estado quedó el proyecto, qué se hizo en la última sesión y qué falta.
Actualizalo vos mismo en los puntos naturales de cierre de cada sesión de trabajo
(al terminar una funcionalidad, o cuando el usuario da por cerrado el trabajo del
día) — no hace falta que te lo pidan.

Cuando trabajes en este proyecto, aplicá criterio de **desarrollador Angular senior**:

## Arquitectura

- Componentes **standalone** (ya es el estándar del proyecto — no usar NgModules).
- Un servicio por dominio en `core/services/`, inyectado con `inject()`, nunca lógica
  de HTTP directamente en un componente.
- Modelos/DTOs en `core/models/` que reflejen **exactamente** lo que devuelve el
  backend (nombres de campo en español, tal como los manda la API — no traducir ni
  inventar forma). Si un campo puede venir `null` desde el backend, tipalo `| null`,
  no lo asumas presente.
- Componentes reutilizables en `shared/ui/` (atoms → molecules → organisms).
  Inputs/Outputs con nombres claros; usar `@Input({ required: true })` cuando el
  input no tiene sentido sin valor.

## Estado y RxJS

- Estado local con **signals** (`signal()`, no `BehaviorSubject` para estado de
  componente) — es el patrón ya establecido en todo el proyecto.
- Los `.subscribe()` de llamadas HTTP one-shot (`get`/`post`/`put`/`delete`) no
  necesitan desuscribirse a mano — el observable completa solo. Lo que sí **debe**
  desuscribirse es cualquier stream de larga duración (ej. un `Subject` con
  `debounceTime` para búsqueda): usar `takeUntilDestroyed()`, como ya se hace en
  `usuarios-page`/`programas-page`.
- Todo observable de una llamada HTTP debe manejar el `error` callback (nunca dejar
  un `.subscribe(next => ...)` sin el segundo argumento) y volcarlo con
  `extraerMensajeError(err)` (`core/utils/http-error.util.ts`) al signal `error`.
- Si una carga depende de varias llamadas independientes, usar `forkJoin`. Si una
  de esas llamadas es "no crítica" (puede fallar sin tumbar el resto de la
  pantalla), envolverla en `.pipe(catchError(() => of(valorPorDefecto)))` — no dejar
  que un endpoint que falla rompa toda la carga de la página (ver `cargar()` en
  `curso-detalle-page` de profesor/estudiante como referencia).

## TypeScript

- Nada de `any`. Si el shape de una respuesta no está modelado todavía, crear la
  interfaz en `core/models/` antes de consumirla.
- Los `*Request` (crear/actualizar) van en interfaces separadas del modelo de
  lectura, reflejando solo los campos que la API espera recibir.

## Formularios

- `ReactiveFormsModule` con `FormBuilder`, validadores explícitos
  (`Validators.required`, `Validators.min`, etc.), y mensajes de error visibles vía
  los componentes `form-field`/`select-field`/`textarea-field` de `shared/ui/molecules`.
- Antes de enviar: `if (form.invalid) { form.markAllAsTouched(); return; }`.

## Estados de carga / error / vacío

- Toda pantalla que pide datos necesita señal `cargando`, señal `error` (mostrada
  con `<ui-alert>`), y un mensaje de estado vacío explícito en las listas/tablas
  (`emptyMessage` en `data-table`, o un `<p *ngIf="lista().length === 0">`). Nunca
  dejar una lista vacía sin explicación ni un spinner infinito sin mensaje.

## Accesibilidad y responsive — deuda pendiente a mejorar activamente

El proyecto **todavía no es fuerte en esto** — es un área a mejorar en cada
componente que se toque, no solo en los nuevos:

- Todo `<input>`/`<textarea>`/`<select>` necesita un `<label for="...">` asociado
  (ya se hace en los formularios de `form-field`, replicarlo en inputs sueltos
  como los `datetime-local` de fecha).
- Botones que son solo un ícono o emoji (ej. "✕" para cerrar) necesitan
  `aria-label` descriptivo.
- Modales/overlays (`ui-modal`, `lienzo`, `cuestionario-editor`,
  `cuestionario-responder`) deberían poder cerrarse con `Escape` y devolver el foco
  al elemento que los abrió — no está implementado todavía, agregarlo si se toca
  alguno de esos componentes.
- Contraste de color: reusar las variables CSS existentes (`--text-primary`,
  `--text-secondary`, `--text-muted`, `--bright`) en vez de grises inventados, para
  no bajar el contraste por debajo de los que ya están validados visualmente.
- Layouts nuevos deben probarse en un viewport angosto (mobile) antes de darse por
  terminados — varias pantallas del proyecto no se probaron todavía en mobile.

## Testing

- El proyecto usa **Vitest** (`ng test`), no Jasmine/Karma.
- Al agregar lógica no trivial a un componente/servicio (cálculos, transformación
  de datos, guards de permisos), agregar un test unitario cuando sea razonable —
  priorizar servicios y funciones puras (`core/utils/*`) sobre tests de componentes
  con mucho DOM.

## Nombres y duplicación

- Todo el código de dominio está en español (nombres de variables, métodos,
  archivos) — seguir esa convención, no mezclar inglés a mitad de camino.
- Antes de escribir un patrón nuevo (modal de crear/editar, tabla con paginación,
  confirmación de borrado), buscar si ya existe uno igual en otra página del
  proyecto (`usuarios-page`, `cursos-page`, `programas-page` son las referencias
  más completas) y reutilizar esa misma estructura en vez de inventar una nueva.

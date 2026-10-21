import { CommonModule, DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, Directive, OnInit, computed, inject, signal, viewChildren } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { UiAlert } from '../../../shared/ui/atoms/ui-alert/ui-alert';
import { UiButton } from '../../../shared/ui/atoms/ui-button/ui-button';
import { FormField } from '../../../shared/ui/molecules/form-field/form-field';
import { SelectField } from '../../../shared/ui/molecules/select-field/select-field';
import { UiSelectOption } from '../../../shared/ui/atoms/ui-select/ui-select';
import { TextareaField } from '../../../shared/ui/molecules/textarea-field/textarea-field';
import { UiModal } from '../../../shared/ui/molecules/ui-modal/ui-modal';
import { DataTable, DataTableColumn } from '../../../shared/ui/organisms/data-table/data-table';
import { ConfirmDialog } from '../../../shared/ui/organisms/confirm-dialog/confirm-dialog';
import { LienzoComponent } from '../../../shared/ui/organisms/lienzo/lienzo';
import { CuestionarioEditorComponent } from '../../../shared/ui/organisms/cuestionario-editor/cuestionario-editor';
import {
  AgregarRecursoSelector,
  TipoRecurso,
} from '../../../shared/ui/organisms/agregar-recurso-selector/agregar-recurso-selector';
import { BloquesEditor } from '../../../shared/ui/organisms/bloques-editor/bloques-editor';
import { CursoDatos } from '../../../shared/ui/molecules/curso-datos/curso-datos';
import { CursoService } from '../../../core/services/curso.service';
import { ModuloService } from '../../../core/services/modulo.service';
import { ContenidoService } from '../../../core/services/contenido.service';
import { MatriculaService } from '../../../core/services/matricula.service';
import { ActividadService } from '../../../core/services/actividad.service';
import { EntregaService } from '../../../core/services/entrega.service';
import { BloqueService } from '../../../core/services/bloque.service';
import { CuestionarioService } from '../../../core/services/cuestionario.service';
import { LienzoService } from '../../../core/services/lienzo.service';
import { PaginaModuloService } from '../../../core/services/pagina-modulo.service';
import { Curso } from '../../../core/models/curso.model';
import { Modulo } from '../../../core/models/modulo.model';
import { Contenido } from '../../../core/models/contenido.model';
import { Matricula } from '../../../core/models/matricula.model';
import { Actividad } from '../../../core/models/actividad.model';
import { Entrega } from '../../../core/models/entrega.model';
import { Bloque } from '../../../core/models/bloque.model';
import { Cuestionario } from '../../../core/models/cuestionario.model';
import { LienzoResumen } from '../../../core/models/lienzo.model';
import { PAGINA_MODULO_TITULO_MAX, PaginaModulo } from '../../../core/models/pagina-modulo.model';
import { extraerErroresPorCampo, extraerMensajeError } from '../../../core/utils/http-error.util';
import { moverElemento } from '../../../core/utils/orden.util';
import { aplanarArbol, armarArbolModulos, idsDelGrupo, moverModulo } from '../../../core/utils/modulo-arbol.util';
import {
  TIPO_CONTENIDO_LABELS,
  formatearFecha,
  formatearFechaRelativa,
  formatearNotaSobre5,
  formatearPuntaje,
} from '../../../core/utils/labels.util';

interface ModuloConContenidos {
  modulo: Modulo;
  contenidos: Contenido[];
  actividades: Actividad[];
  bloques: Bloque[];
  cuestionarios: Cuestionario[];
  cuestionariosError: boolean;
  paginas: PaginaModulo[];
  paginasError: boolean;
  // Hojas del lienzo (diseño libre); no confundir con las páginas del módulo.
  hojas: LienzoResumen[];
}

type Tab = 'curso' | 'participantes';

interface ContextoTarjetaModulo {
  $implicit: ModuloConContenidos;
  indice: number;
  total: number;
  esHijo: boolean;
}

interface ContextoNavModulo {
  $implicit: ModuloConContenidos;
  esHijo: boolean;
}

// Dan tipo al contexto de los ng-template de módulo (sin esto, 'item' sería any).
@Directive({ selector: 'ng-template[tarjetaModulo]', standalone: true })
export class TarjetaModuloTemplate {
  static ngTemplateContextGuard(_dir: TarjetaModuloTemplate, ctx: unknown): ctx is ContextoTarjetaModulo {
    return true;
  }
}

@Directive({ selector: 'ng-template[navModulo]', standalone: true })
export class NavModuloTemplate {
  static ngTemplateContextGuard(_dir: NavModuloTemplate, ctx: unknown): ctx is ContextoNavModulo {
    return true;
  }
}

// Valor del select de módulo padre que representa "sin padre" (los ids van como texto).
const SIN_PADRE = 'raiz';

@Component({
  selector: 'app-profesor-curso-detalle-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    CursoDatos,
    UiAlert,
    UiButton,
    FormField,
    SelectField,
    TextareaField,
    UiModal,
    DataTable,
    ConfirmDialog,
    LienzoComponent,
    CuestionarioEditorComponent,
    AgregarRecursoSelector,
    TarjetaModuloTemplate,
    NavModuloTemplate,
    BloquesEditor,
  ],
  templateUrl: './curso-detalle-page.html',
  styleUrl: './curso-detalle-page.scss',
})
export class ProfesorCursoDetallePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly documento = inject(DOCUMENT);
  private readonly cursoService = inject(CursoService);
  private readonly moduloService = inject(ModuloService);
  private readonly contenidoService = inject(ContenidoService);
  private readonly matriculaService = inject(MatriculaService);
  private readonly actividadService = inject(ActividadService);
  private readonly entregaService = inject(EntregaService);
  private readonly cuestionarioService = inject(CuestionarioService);
  private readonly lienzoService = inject(LienzoService);
  private readonly fb = inject(FormBuilder);
  private readonly bloqueService = inject(BloqueService);
  private readonly router = inject(Router);
  private readonly paginaModuloService = inject(PaginaModuloService);

  readonly cursoId = Number(this.route.snapshot.paramMap.get('cursoId'));

  readonly curso = signal<Curso | null>(null);
  readonly modulos = signal<ModuloConContenidos[]>([]);
  readonly cargando = signal(false);
  readonly error = signal('');

  readonly tipoLabels = TIPO_CONTENIDO_LABELS;
  readonly formatearFecha = formatearFecha;

  readonly tabActiva = signal<Tab>('curso');
  readonly participantes = signal<Matricula[]>([]);
  readonly cargandoParticipantes = signal(false);
  private participantesCargados = false;

  readonly navAbierta = signal(true);
  readonly modulosColapsados = signal<Set<number>>(new Set());

  toggleNav(): void {
    this.navAbierta.update((valor) => !valor);
  }

  toggleModuloNav(moduloId: number): void {
    const colapsados = new Set(this.modulosColapsados());
    if (colapsados.has(moduloId)) {
      colapsados.delete(moduloId);
    } else {
      colapsados.add(moduloId);
    }
    this.modulosColapsados.set(colapsados);
  }

  moduloColapsado(moduloId: number): boolean {
    return this.modulosColapsados().has(moduloId);
  }

  readonly participantesColumnas: DataTableColumn<Matricula>[] = [
    { key: 'nombre', label: 'Nombre', format: (m) => m.estudianteNombre || `Estudiante #${m.estudianteId}` },
    { key: 'email', label: 'Correo', format: (m) => m.estudianteEmail ?? '—' },
    { key: 'fecha', label: 'Matriculado', format: (m) => formatearFecha(m.fechaMatricula) },
    { key: 'ultimoAcceso', label: 'Último acceso al curso', format: (m) => formatearFechaRelativa(m.fechaUltimoAcceso) },
  ];

  // --- Actividades ---
  readonly actividadModalAbierto = signal(false);
  readonly actividadModoEdicion = signal(false);
  readonly actividadEditando = signal<Actividad | null>(null);
  readonly moduloActivo = signal<number | null>(null);
  readonly guardandoActividad = signal(false);

  readonly actividadForm = this.fb.group({
    titulo: ['', [Validators.required]],
    descripcion: [''],
    fechaEntrega: [''],
    puntajeMaximo: [20, [Validators.required, Validators.min(1)]],
  });

  readonly confirmEliminarActividadAbierto = signal(false);
  readonly actividadAEliminar = signal<Actividad | null>(null);
  readonly eliminandoActividad = signal(false);

  // --- Entregas ---
  readonly entregasModalAbierto = signal(false);
  readonly actividadEntregas = signal<Actividad | null>(null);
  readonly entregas = signal<Entrega[]>([]);
  readonly cargandoEntregas = signal(false);

  readonly entregasColumnas: DataTableColumn<Entrega>[] = [
    { key: 'nombre', label: 'Estudiante', format: (e) => e.estudianteNombre || `Estudiante #${e.estudianteId}` },
    { key: 'archivo', label: 'Archivo', format: (e) => e.nombreArchivo },
    { key: 'fecha', label: 'Entregado', format: (e) => formatearFecha(e.fechaEntrega) },
    {
      key: 'nota',
      label: 'Nota',
      format: (e) =>
        e.nota != null && e.notaSobre5 != null
          ? `${formatearNotaSobre5(e.notaSobre5)} / 5,0 · ${formatearPuntaje(e.nota)} de ${this.actividadEntregas()?.puntajeMaximo ?? ''} pts`
          : 'Sin calificar',
    },
  ];

  readonly calificarModalAbierto = signal(false);
  readonly entregaCalificando = signal<Entrega | null>(null);
  readonly guardandoCalificacion = signal(false);

  readonly calificarForm = this.fb.group({
    nota: [0, [Validators.required, Validators.min(0)]],
    comentario: [''],
  });

  // --- Módulos ---
  readonly moduloModalAbierto = signal(false);
  readonly moduloModoEdicion = signal(false);
  readonly moduloEditando = signal<Modulo | null>(null);
  readonly guardandoModulo = signal(false);

  readonly errorModulo = signal('');

  readonly moduloForm = this.fb.nonNullable.group({
    titulo: ['', [Validators.required, Validators.pattern(/\S/)]],
    moduloPadreId: [SIN_PADRE as string],
  });

  readonly confirmEliminarModuloAbierto = signal(false);
  readonly moduloAEliminar = signal<Modulo | null>(null);
  readonly eliminandoModulo = signal(false);

  // --- Bloques sueltos del módulo (la edición vive en BloquesEditor) ---
  private readonly editoresBloques = viewChildren(BloquesEditor);

  // --- Páginas del módulo (recurso "Página") ---
  readonly paginaModalAbierto = signal(false);
  readonly paginaEditando = signal<PaginaModulo | null>(null);
  readonly guardandoPagina = signal(false);
  readonly errorPagina = signal('');
  readonly paginaTituloMax = PAGINA_MODULO_TITULO_MAX;

  readonly paginaForm = this.fb.nonNullable.group({
    titulo: ['', [Validators.required, Validators.maxLength(PAGINA_MODULO_TITULO_MAX), Validators.pattern(/\S/)]],
  });

  readonly paginaAEliminar = signal<PaginaModulo | null>(null);
  readonly eliminandoPagina = signal(false);

  // --- Lienzo libre (editor tipo Canva). Sus "hojas" no son las Páginas del módulo. ---
  readonly lienzoAbierto = signal<{ moduloId: number; titulo: string; paginaInicialId: number | null } | null>(null);

  abrirLienzo(moduloId: number, titulo: string): void {
    this.lienzoAbierto.set({ moduloId, titulo, paginaInicialId: null });
  }

  abrirHoja(moduloId: number, hojaId: number, tituloModulo: string): void {
    this.lienzoAbierto.set({ moduloId, titulo: tituloModulo, paginaInicialId: hojaId });
  }

  cerrarLienzo(): void {
    this.lienzoAbierto.set(null);
  }

  // --- Cuestionarios (quiz de opción múltiple) ---
  readonly cuestionarioModalAbierto = signal(false);
  readonly cuestionarioModoEdicion = signal(false);
  readonly cuestionarioEditando = signal<Cuestionario | null>(null);
  readonly guardandoCuestionario = signal(false);

  readonly cuestionarioForm = this.fb.group({
    titulo: ['', [Validators.required]],
    descripcion: [''],
    fechaApertura: [''],
    fechaEntrega: [''],
    tiempoLimiteMinutos: [''],
    mostrarNota: [false],
  });

  readonly confirmEliminarCuestionarioAbierto = signal(false);
  readonly cuestionarioAEliminar = signal<Cuestionario | null>(null);
  readonly eliminandoCuestionario = signal(false);

  readonly cuestionarioEditorAbierto = signal<{ id: number; moduloId: number } | null>(null);

  abrirCrearCuestionario(moduloId: number): void {
    this.moduloActivo.set(moduloId);
    this.cuestionarioModoEdicion.set(false);
    this.cuestionarioEditando.set(null);
    this.cuestionarioForm.reset({
      titulo: '',
      descripcion: '',
      fechaApertura: '',
      fechaEntrega: '',
      tiempoLimiteMinutos: '',
      // La nota solo se muestra si el profesor lo habilita explícitamente.
      mostrarNota: false,
    });
    this.cuestionarioModalAbierto.set(true);
  }

  abrirEditarCuestionario(cuestionario: Cuestionario): void {
    this.moduloActivo.set(cuestionario.moduloId);
    this.cuestionarioModoEdicion.set(true);
    this.cuestionarioEditando.set(cuestionario);
    this.cuestionarioForm.reset({
      titulo: cuestionario.titulo,
      descripcion: cuestionario.descripcion,
      fechaApertura: cuestionario.fechaApertura ? cuestionario.fechaApertura.slice(0, 16) : '',
      fechaEntrega: cuestionario.fechaEntrega ? cuestionario.fechaEntrega.slice(0, 16) : '',
      tiempoLimiteMinutos: cuestionario.tiempoLimiteMinutos != null ? String(cuestionario.tiempoLimiteMinutos) : '',
      mostrarNota: cuestionario.mostrarNota,
    });
    this.cuestionarioModalAbierto.set(true);
  }

  cerrarModalCuestionario(): void {
    this.cuestionarioModalAbierto.set(false);
  }

  guardarCuestionario(): void {
    if (this.cuestionarioForm.invalid) {
      this.cuestionarioForm.markAllAsTouched();
      return;
    }

    this.guardandoCuestionario.set(true);
    this.error.set('');
    const valores = this.cuestionarioForm.getRawValue();
    const datos = {
      titulo: valores.titulo!,
      descripcion: valores.descripcion ?? '',
      fechaApertura: valores.fechaApertura ? valores.fechaApertura : null,
      fechaEntrega: valores.fechaEntrega ? valores.fechaEntrega : null,
      tiempoLimiteMinutos: valores.tiempoLimiteMinutos ? Number(valores.tiempoLimiteMinutos) : null,
      mostrarNota: valores.mostrarNota ?? false,
    };

    const editando = this.cuestionarioModoEdicion() ? this.cuestionarioEditando() : null;
    const obs = editando
      ? this.cuestionarioService.actualizar(editando.id, datos)
      : this.cuestionarioService.crear(this.moduloActivo()!, datos);

    obs.subscribe({
      next: () => {
        this.guardandoCuestionario.set(false);
        this.cuestionarioModalAbierto.set(false);
        this.cargar();
      },
      error: (err: HttpErrorResponse) => {
        this.guardandoCuestionario.set(false);
        this.error.set(extraerMensajeError(err));
      },
    });
  }

  pedirEliminarCuestionario(cuestionario: Cuestionario): void {
    this.cuestionarioAEliminar.set(cuestionario);
    this.confirmEliminarCuestionarioAbierto.set(true);
  }

  confirmarEliminarCuestionario(): void {
    const cuestionario = this.cuestionarioAEliminar();
    if (!cuestionario) {
      return;
    }
    this.eliminandoCuestionario.set(true);
    this.cuestionarioService.eliminar(cuestionario.id).subscribe({
      next: () => {
        this.eliminandoCuestionario.set(false);
        this.confirmEliminarCuestionarioAbierto.set(false);
        this.cargar();
      },
      error: (err: HttpErrorResponse) => {
        this.eliminandoCuestionario.set(false);
        this.confirmEliminarCuestionarioAbierto.set(false);
        this.error.set(extraerMensajeError(err));
      },
    });
  }

  abrirEditorCuestionario(cuestionario: Cuestionario): void {
    this.cuestionarioEditorAbierto.set({ id: cuestionario.id, moduloId: cuestionario.moduloId });
  }

  // Al cerrar el editor solo cambian los cuestionarios de ese módulo (puntaje,
  // o que se haya eliminado): se recargan esos, no el curso entero (que son
  // ~7 llamadas por módulo y dejaba la página en "Cargando…" varios segundos).
  cerrarEditorCuestionario(): void {
    const abierto = this.cuestionarioEditorAbierto();
    this.cuestionarioEditorAbierto.set(null);
    if (!abierto) {
      return;
    }
    this.cuestionarioService.listarPorModulo(abierto.moduloId).subscribe({
      next: (cuestionarios) => {
        this.modulos.set(
          this.modulos().map((item) =>
            item.modulo.id === abierto.moduloId ? { ...item, cuestionarios, cuestionariosError: false } : item,
          ),
        );
        // La tarjeta se vuelve a dibujar: el foco vuelve a su botón (si el cuestionario sigue existiendo).
        setTimeout(() => this.documento.getElementById(`cq-abrir-${abierto.id}`)?.querySelector('button')?.focus());
      },
      error: (err: HttpErrorResponse) => this.error.set(extraerMensajeError(err)),
    });
  }

  ngOnInit(): void {
    this.cargar();
    if (this.route.snapshot.queryParamMap.get('tab') === 'participantes') {
      this.seleccionarTab('participantes');
    }
  }

  seleccionarTab(tab: Tab): void {
    this.tabActiva.set(tab);
    if (tab === 'participantes' && !this.participantesCargados) {
      this.cargarParticipantes();
    }
  }

  private cargarParticipantes(): void {
    this.cargandoParticipantes.set(true);
    this.error.set('');
    this.matriculaService.listarPorCurso(this.cursoId).subscribe({
      next: (lista) => {
        this.participantes.set(lista);
        this.participantesCargados = true;
        this.cargandoParticipantes.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.cargandoParticipantes.set(false);
        this.error.set(extraerMensajeError(err));
      },
    });
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set('');

    forkJoin({
      curso: this.cursoService.obtener(this.cursoId),
      modulos: this.moduloService.listarPorCurso(this.cursoId),
    }).subscribe({
      next: ({ curso, modulos }) => {
        this.curso.set(curso);
        // Orden de lectura: cada raíz seguida de sus submódulos.
        const ordenados = aplanarArbol(armarArbolModulos(modulos));

        if (ordenados.length === 0) {
          this.modulos.set([]);
          this.cargando.set(false);
          return;
        }

        forkJoin(
          ordenados.map((m) =>
            forkJoin({
              contenidos: this.contenidoService.listarPorModulo(m.id),
              actividades: this.actividadService.listarPorModulo(m.id),
              bloques: this.bloqueService.listarPorModulo(m.id),
              // Si el backend de cuestionarios falla, no debe tumbar el resto del
              // módulo (bloques/actividades/contenidos siguen funcionando bien),
              // pero sin ocultar el fallo como si simplemente no hubiera ninguno.
              cuestionarios: this.cuestionarioService.listarPorModulo(m.id).pipe(
                map((items) => ({ items, fallo: false })),
                catchError((err: HttpErrorResponse) => {
                  console.error(`Fallo al cargar cuestionarios del módulo ${m.id}`, err);
                  return of({ items: [] as Cuestionario[], fallo: true });
                }),
              ),
              // Mismo criterio que cuestionarios: no tumba el módulo, pero el fallo se ve.
              paginas: this.paginaModuloService.listarPorModulo(m.id).pipe(
                map((items) => ({ items, fallo: false })),
                catchError((err: HttpErrorResponse) => {
                  console.error(`Fallo al cargar las páginas del módulo ${m.id}`, err);
                  return of({ items: [] as PaginaModulo[], fallo: true });
                }),
              ),
              // No crítico: si falla, el módulo se ve igual sin las hojas del lienzo en la navegación.
              hojas: this.lienzoService.listar(m.id).pipe(catchError(() => of([] as LienzoResumen[]))),
            }),
          ),
        ).subscribe({
          next: (resultados) => {
            this.modulos.set(
              ordenados.map((modulo, i) => ({
                modulo,
                contenidos: resultados[i].contenidos,
                actividades: resultados[i].actividades,
                bloques: resultados[i].bloques,
                cuestionarios: resultados[i].cuestionarios.items,
                cuestionariosError: resultados[i].cuestionarios.fallo,
                paginas: resultados[i].paginas.items,
                paginasError: resultados[i].paginas.fallo,
                hojas: resultados[i].hojas,
              })),
            );
            this.cargando.set(false);
          },
          error: (err: HttpErrorResponse) => {
            this.cargando.set(false);
            this.error.set(extraerMensajeError(err));
          },
        });
      },
      error: (err: HttpErrorResponse) => {
        this.cargando.set(false);
        this.error.set(extraerMensajeError(err));
      },
    });
  }

  toggleVisibilidad(contenido: Contenido): void {
    this.error.set('');
    this.contenidoService.cambiarVisibilidad(contenido.id, !contenido.visible).subscribe({
      next: () => this.cargar(),
      error: (err: HttpErrorResponse) => this.error.set(extraerMensajeError(err)),
    });
  }

  ver(contenido: Contenido): void {
    this.error.set('');
    this.contenidoService.obtenerUrl(contenido.id).subscribe({
      next: (respuesta) => window.open(respuesta.url, '_blank', 'noopener'),
      error: (err: HttpErrorResponse) => this.error.set(extraerMensajeError(err)),
    });
  }

  // --- Actividades ---

  abrirCrearActividad(moduloId: number): void {
    this.moduloActivo.set(moduloId);
    this.actividadModoEdicion.set(false);
    this.actividadEditando.set(null);
    this.actividadForm.reset({ titulo: '', descripcion: '', fechaEntrega: '', puntajeMaximo: 20 });
    this.actividadModalAbierto.set(true);
  }

  abrirEditarActividad(actividad: Actividad): void {
    this.moduloActivo.set(actividad.moduloId);
    this.actividadModoEdicion.set(true);
    this.actividadEditando.set(actividad);
    this.actividadForm.reset({
      titulo: actividad.titulo,
      descripcion: actividad.descripcion,
      fechaEntrega: actividad.fechaEntrega ? actividad.fechaEntrega.slice(0, 16) : '',
      puntajeMaximo: actividad.puntajeMaximo,
    });
    this.actividadModalAbierto.set(true);
  }

  cerrarModalActividad(): void {
    this.actividadModalAbierto.set(false);
  }

  guardarActividad(): void {
    if (this.actividadForm.invalid) {
      this.actividadForm.markAllAsTouched();
      return;
    }

    this.guardandoActividad.set(true);
    this.error.set('');
    const valores = this.actividadForm.getRawValue();
    const datos = {
      titulo: valores.titulo!,
      descripcion: valores.descripcion ?? '',
      fechaEntrega: valores.fechaEntrega ? valores.fechaEntrega : null,
      puntajeMaximo: Number(valores.puntajeMaximo),
    };

    const editando = this.actividadModoEdicion() ? this.actividadEditando() : null;
    const obs = editando
      ? this.actividadService.actualizar(editando.id, datos)
      : this.actividadService.crear(this.moduloActivo()!, datos);

    obs.subscribe({
      next: () => {
        this.guardandoActividad.set(false);
        this.actividadModalAbierto.set(false);
        this.cargar();
      },
      error: (err: HttpErrorResponse) => {
        this.guardandoActividad.set(false);
        this.error.set(extraerMensajeError(err));
      },
    });
  }

  pedirEliminarActividad(actividad: Actividad): void {
    this.actividadAEliminar.set(actividad);
    this.confirmEliminarActividadAbierto.set(true);
  }

  confirmarEliminarActividad(): void {
    const actividad = this.actividadAEliminar();
    if (!actividad) {
      return;
    }
    this.eliminandoActividad.set(true);
    this.actividadService.eliminar(actividad.id).subscribe({
      next: () => {
        this.eliminandoActividad.set(false);
        this.confirmEliminarActividadAbierto.set(false);
        this.cargar();
      },
      error: (err: HttpErrorResponse) => {
        this.eliminandoActividad.set(false);
        this.confirmEliminarActividadAbierto.set(false);
        this.error.set(extraerMensajeError(err));
      },
    });
  }

  // --- Entregas / calificación ---

  abrirEntregas(actividad: Actividad): void {
    this.actividadEntregas.set(actividad);
    this.entregasModalAbierto.set(true);
    this.cargandoEntregas.set(true);
    this.error.set('');
    this.entregaService.listarPorActividad(actividad.id).subscribe({
      next: (lista) => {
        this.entregas.set(lista);
        this.cargandoEntregas.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.cargandoEntregas.set(false);
        this.error.set(extraerMensajeError(err));
      },
    });
  }

  cerrarModalEntregas(): void {
    this.entregasModalAbierto.set(false);
  }

  verEntrega(entrega: Entrega): void {
    this.error.set('');
    this.entregaService.obtenerUrl(entrega.id).subscribe({
      next: (respuesta) => window.open(respuesta.url, '_blank', 'noopener'),
      error: (err: HttpErrorResponse) => this.error.set(extraerMensajeError(err)),
    });
  }

  abrirCalificar(entrega: Entrega): void {
    this.entregaCalificando.set(entrega);
    this.calificarForm.reset({ nota: entrega.nota ?? 0, comentario: entrega.comentarioDocente ?? '' });
    this.calificarModalAbierto.set(true);
  }

  cerrarModalCalificar(): void {
    this.calificarModalAbierto.set(false);
  }

  guardarCalificacion(): void {
    if (this.calificarForm.invalid) {
      this.calificarForm.markAllAsTouched();
      return;
    }
    const entrega = this.entregaCalificando();
    if (!entrega) {
      return;
    }

    this.guardandoCalificacion.set(true);
    this.error.set('');
    const valores = this.calificarForm.getRawValue();

    this.entregaService.calificar(entrega.id, { nota: Number(valores.nota), comentario: valores.comentario ?? '' }).subscribe({
      next: (actualizada) => {
        this.guardandoCalificacion.set(false);
        this.calificarModalAbierto.set(false);
        this.entregas.set(this.entregas().map((e) => (e.id === actualizada.id ? actualizada : e)));
      },
      error: (err: HttpErrorResponse) => {
        this.guardandoCalificacion.set(false);
        this.error.set(extraerMensajeError(err));
      },
    });
  }

  // --- Módulos ---

  // --- Árbol de módulos (raíces con submódulos, un solo nivel) ---

  readonly arbol = computed(() => {
    const items = this.modulos();
    const porId = new Map(items.map((i) => [i.modulo.id, i]));
    return armarArbolModulos(items.map((i) => i.modulo)).map((rama) => ({
      item: porId.get(rama.modulo.id)!,
      hijos: rama.hijos.map((h) => porId.get(h.id)!),
    }));
  });

  readonly raicesColapsadas = signal<Set<number>>(new Set());

  toggleSubmodulos(moduloId: number): void {
    this.raicesColapsadas.update((actual) => {
      const nuevo = new Set(actual);
      if (nuevo.has(moduloId)) {
        nuevo.delete(moduloId);
      } else {
        nuevo.add(moduloId);
      }
      return nuevo;
    });
  }

  // Opciones del select "Módulo padre": solo raíces, sin el propio módulo.
  opcionesPadre(): UiSelectOption[] {
    const editando = this.moduloModoEdicion() ? this.moduloEditando() : null;
    return [
      { value: SIN_PADRE, label: 'Sin padre / raíz' },
      ...this.arbol()
        .filter((rama) => rama.item.modulo.id !== editando?.id)
        .map((rama) => ({ value: String(rama.item.modulo.id), label: rama.item.modulo.titulo })),
    ];
  }

  // Un módulo con submódulos no puede pasar a ser submódulo (el backend lo rechaza).
  editandoTieneHijos(): boolean {
    const editando = this.moduloModoEdicion() ? this.moduloEditando() : null;
    return !!editando && this.modulos().some((i) => i.modulo.moduloPadreId === editando.id);
  }

  abrirCrearModulo(padreId: number | null = null): void {
    this.moduloModoEdicion.set(false);
    this.moduloEditando.set(null);
    this.errorModulo.set('');
    this.moduloForm.reset({ titulo: '', moduloPadreId: padreId === null ? SIN_PADRE : String(padreId) });
    this.moduloForm.controls.moduloPadreId.enable();
    this.moduloModalAbierto.set(true);
  }

  abrirEditarModulo(modulo: Modulo): void {
    this.moduloModoEdicion.set(true);
    this.moduloEditando.set(modulo);
    this.errorModulo.set('');
    this.moduloForm.reset({
      titulo: modulo.titulo,
      moduloPadreId: modulo.moduloPadreId === null ? SIN_PADRE : String(modulo.moduloPadreId),
    });
    // Con submódulos solo puede seguir siendo raíz: el select queda bloqueado
    // (getRawValue igual lo incluye, así el PUT manda moduloPadreId: null).
    if (this.editandoTieneHijos()) {
      this.moduloForm.controls.moduloPadreId.disable();
    } else {
      this.moduloForm.controls.moduloPadreId.enable();
    }
    this.moduloModalAbierto.set(true);
  }

  cerrarModalModulo(): void {
    this.moduloModalAbierto.set(false);
  }

  guardarModulo(): void {
    if (this.moduloForm.invalid) {
      this.moduloForm.markAllAsTouched();
      return;
    }

    const valores = this.moduloForm.getRawValue();
    const moduloPadreId = valores.moduloPadreId === SIN_PADRE ? null : Number(valores.moduloPadreId);
    const editando = this.moduloModoEdicion() ? this.moduloEditando() : null;
    const hermanos = idsDelGrupo(
      this.modulos().map((i) => i.modulo),
      moduloPadreId,
    ).filter((id) => id !== editando?.id);
    // Si se queda en el mismo grupo conserva su orden; si cambia de grupo (o es nuevo), va al final.
    const orden = editando && editando.moduloPadreId === moduloPadreId ? editando.orden : hermanos.length + 1;
    // moduloPadreId va siempre: si se omite, el backend mueve el módulo a la raíz.
    const datos = { titulo: valores.titulo.trim(), orden, moduloPadreId };

    this.guardandoModulo.set(true);
    this.errorModulo.set('');
    const obs = editando
      ? this.moduloService.actualizar(editando.id, datos)
      : this.moduloService.crear(this.cursoId, datos);

    obs.subscribe({
      next: () => {
        this.guardandoModulo.set(false);
        this.moduloModalAbierto.set(false);
        this.cargar();
      },
      error: (err: HttpErrorResponse) => {
        this.guardandoModulo.set(false);
        this.errorModulo.set(extraerMensajeError(err));
      },
    });
  }

  // --- Mover módulos: arrastrando o con ↑/↓ ---

  readonly moduloArrastrado = signal<number | null>(null);
  readonly destinoResaltado = signal<string | null>(null);
  readonly moviendoModulo = signal(false);

  inicioArrastreModulo(evento: DragEvent, moduloId: number): void {
    // Firefox no inicia el arrastre sin datos.
    evento.dataTransfer?.setData('text/plain', `modulo-${moduloId}`);
    if (evento.dataTransfer) {
      evento.dataTransfer.effectAllowed = 'move';
    }
    // Diferido: cambiar el DOM (zonas de "soltar acá") dentro de dragstart hace
    // que Chrome cancele el arrastre.
    setTimeout(() => this.moduloArrastrado.set(moduloId));
  }

  finArrastreModulo(): void {
    this.moduloArrastrado.set(null);
    this.destinoResaltado.set(null);
  }

  sobreDestino(evento: DragEvent, clave: string): void {
    if (this.moduloArrastrado() === null) {
      return;
    }
    evento.preventDefault();
    this.destinoResaltado.set(clave);
  }

  salirDeDestino(clave: string): void {
    if (this.destinoResaltado() === clave) {
      this.destinoResaltado.set(null);
    }
  }

  /** Soltar sobre la cabecera de un módulo: queda justo antes de él, como su hermano. */
  soltarAntesDe(evento: DragEvent, destino: Modulo): void {
    const id = this.moduloArrastrado();
    this.finArrastreModulo();
    if (id === null || id === destino.id) {
      return;
    }
    evento.preventDefault();
    const grupo = idsDelGrupo(
      this.modulos().map((i) => i.modulo),
      destino.moduloPadreId,
    ).filter((x) => x !== id);
    this.moverModuloA(id, destino.moduloPadreId, grupo.indexOf(destino.id));
  }

  /** Soltar en la zona "dentro de X" (padreId) o "al final de la raíz" (null). */
  soltarAlFinal(evento: DragEvent, padreId: number | null): void {
    const id = this.moduloArrastrado();
    this.finArrastreModulo();
    if (id === null || id === padreId) {
      return;
    }
    evento.preventDefault();
    this.moverModuloA(id, padreId);
  }

  moverEntreHermanos(modulo: Modulo, indice: number, delta: -1 | 1): void {
    this.moverModuloA(modulo.id, modulo.moduloPadreId, indice + delta);
  }

  /**
   * Optimista: se ve al instante y se revierte si el backend responde error
   * (ej. 400 por anidar un tercer nivel), mostrando su mensaje tal cual.
   */
  private moverModuloA(moduloId: number, nuevoPadreId: number | null, indice?: number): void {
    const anterior = this.modulos();
    const modulo = anterior.find((i) => i.modulo.id === moduloId)?.modulo;
    if (!modulo || this.moviendoModulo()) {
      return;
    }
    const lista = moverModulo(
      anterior.map((i) => i.modulo),
      moduloId,
      nuevoPadreId,
      indice,
    );
    const actualizado = lista.find((m) => m.id === moduloId)!;
    const sinCambios = lista.every((m) => {
      const previo = anterior.find((i) => i.modulo.id === m.id)!.modulo;
      return previo.orden === m.orden && previo.moduloPadreId === m.moduloPadreId;
    });
    if (sinCambios) {
      return;
    }

    const porId = new Map(lista.map((m) => [m.id, m]));
    this.modulos.set(anterior.map((i) => ({ ...i, modulo: porId.get(i.modulo.id)! })));
    this.error.set('');
    this.moviendoModulo.set(true);

    const idsNuevoGrupo = idsDelGrupo(lista, nuevoPadreId);
    const peticion =
      modulo.moduloPadreId === nuevoPadreId
        ? this.moduloService.reordenar(this.cursoId, nuevoPadreId, idsNuevoGrupo)
        : this.moduloService
            .actualizar(moduloId, { titulo: modulo.titulo, orden: actualizado.orden, moduloPadreId: nuevoPadreId })
            .pipe(switchMap(() => this.moduloService.reordenar(this.cursoId, nuevoPadreId, idsNuevoGrupo)));

    peticion.subscribe({
      next: () => this.moviendoModulo.set(false),
      error: (err: HttpErrorResponse) => {
        this.moviendoModulo.set(false);
        this.modulos.set(anterior);
        this.error.set(extraerMensajeError(err));
      },
    });
  }

  pedirEliminarModulo(modulo: Modulo): void {
    this.moduloAEliminar.set(modulo);
    this.confirmEliminarModuloAbierto.set(true);
  }

  confirmarEliminarModulo(): void {
    const modulo = this.moduloAEliminar();
    if (!modulo) {
      return;
    }
    this.eliminandoModulo.set(true);
    this.moduloService.eliminar(modulo.id).subscribe({
      next: () => {
        this.eliminandoModulo.set(false);
        this.confirmEliminarModuloAbierto.set(false);
        this.cargar();
      },
      error: (err: HttpErrorResponse) => {
        this.eliminandoModulo.set(false);
        this.confirmEliminarModuloAbierto.set(false);
        this.error.set(extraerMensajeError(err));
      },
    });
  }

  // --- Bloques sueltos del módulo ---

  actualizarBloquesDelModulo(moduloId: number, bloques: Bloque[]): void {
    this.modulos.update((lista) => lista.map((item) => (item.modulo.id === moduloId ? { ...item, bloques } : item)));
  }

  // --- Selector único "Agregar actividad o recurso" ---
  readonly selectorRecursoModulo = signal<Modulo | null>(null);

  abrirSelectorRecurso(modulo: Modulo): void {
    this.selectorRecursoModulo.set(modulo);
  }

  cerrarSelectorRecurso(): void {
    this.selectorRecursoModulo.set(null);
  }

  // Cada opción abre el mismo flujo de creación que ya existía para ese tipo.
  elegirRecurso(tipo: TipoRecurso): void {
    const modulo = this.selectorRecursoModulo();
    this.selectorRecursoModulo.set(null);
    if (!modulo) {
      return;
    }
    switch (tipo) {
      case 'ACTIVIDAD':
        this.abrirCrearActividad(modulo.id);
        break;
      case 'CUESTIONARIO':
        this.abrirCrearCuestionario(modulo.id);
        break;
      case 'LIENZO':
        this.abrirLienzo(modulo.id, modulo.titulo);
        break;
      case 'PAGINA':
        this.abrirCrearPagina(modulo.id);
        break;
      default:
        this.editoresBloques()
          .find((editor) => editor.contenedor().id === modulo.id)
          ?.iniciarAgregar(tipo);
    }
  }

  moduloVacio(item: ModuloConContenidos): boolean {
    return (
      item.bloques.length === 0 &&
      item.contenidos.length === 0 &&
      item.actividades.length === 0 &&
      item.cuestionarios.length === 0 &&
      !item.cuestionariosError &&
      item.paginas.length === 0 &&
      !item.paginasError &&
      item.hojas.length === 0
    );
  }

  // --- Páginas del módulo ---

  abrirCrearPagina(moduloId: number): void {
    this.moduloActivo.set(moduloId);
    this.paginaEditando.set(null);
    this.paginaForm.reset({ titulo: '' });
    this.errorPagina.set('');
    this.paginaModalAbierto.set(true);
  }

  abrirRenombrarPagina(pagina: PaginaModulo): void {
    this.moduloActivo.set(pagina.moduloId);
    this.paginaEditando.set(pagina);
    this.paginaForm.reset({ titulo: pagina.titulo });
    this.errorPagina.set('');
    this.paginaModalAbierto.set(true);
  }

  cerrarModalPagina(): void {
    this.paginaModalAbierto.set(false);
  }

  guardarPagina(): void {
    if (this.paginaForm.invalid) {
      this.paginaForm.markAllAsTouched();
      return;
    }
    const moduloId = this.moduloActivo();
    if (moduloId == null) {
      return;
    }
    const datos = { titulo: this.paginaForm.getRawValue().titulo.trim() };
    const editando = this.paginaEditando();
    this.guardandoPagina.set(true);
    this.errorPagina.set('');

    const obs = editando
      ? this.paginaModuloService.actualizar(editando.id, datos)
      : this.paginaModuloService.crear(moduloId, datos);

    obs.subscribe({
      next: (pagina) => {
        this.guardandoPagina.set(false);
        this.paginaModalAbierto.set(false);
        if (editando) {
          this.actualizarPaginasDelModulo(moduloId, (lista) => lista.map((p) => (p.id === pagina.id ? pagina : p)));
        } else {
          // Recién creada está vacía: se abre directo para empezar a llenarla.
          this.router.navigate(['/profesor/cursos', this.cursoId, 'paginas', pagina.id]);
        }
      },
      error: (err: HttpErrorResponse) => {
        this.guardandoPagina.set(false);
        this.errorPagina.set(extraerErroresPorCampo(err)?.['titulo'] ?? extraerMensajeError(err));
      },
    });
  }

  pedirEliminarPagina(pagina: PaginaModulo): void {
    this.paginaAEliminar.set(pagina);
  }

  confirmarEliminarPagina(): void {
    const pagina = this.paginaAEliminar();
    if (!pagina) {
      return;
    }
    this.eliminandoPagina.set(true);
    this.error.set('');
    this.paginaModuloService.eliminar(pagina.id).subscribe({
      next: () => {
        this.eliminandoPagina.set(false);
        this.paginaAEliminar.set(null);
        this.actualizarPaginasDelModulo(pagina.moduloId, (lista) => lista.filter((p) => p.id !== pagina.id));
      },
      error: (err: HttpErrorResponse) => {
        this.eliminandoPagina.set(false);
        this.paginaAEliminar.set(null);
        this.error.set(extraerMensajeError(err));
      },
    });
  }

  // Optimista con botones ↑/↓: se muestra al instante y se revierte si el backend falla.
  moverPagina(item: ModuloConContenidos, indice: number, delta: -1 | 1): void {
    const anterior = item.paginas;
    const nueva = moverElemento(anterior, indice, indice + delta);
    if (nueva.every((p, i) => p.id === anterior[i].id)) {
      return;
    }
    const moduloId = item.modulo.id;
    this.error.set('');
    this.actualizarPaginasDelModulo(moduloId, () => nueva);
    this.paginaModuloService.reordenar(moduloId, nueva.map((p) => p.id)).subscribe({
      next: () => {},
      error: (err: HttpErrorResponse) => {
        this.actualizarPaginasDelModulo(moduloId, () => anterior);
        this.error.set(extraerMensajeError(err));
      },
    });
  }

  private actualizarPaginasDelModulo(moduloId: number, cambio: (paginas: PaginaModulo[]) => PaginaModulo[]): void {
    this.modulos.update((lista) =>
      lista.map((item) => (item.modulo.id === moduloId ? { ...item, paginas: cambio(item.paginas) } : item)),
    );
  }
}

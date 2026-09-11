import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { UiAlert } from '../../../shared/ui/atoms/ui-alert/ui-alert';
import { UiButton } from '../../../shared/ui/atoms/ui-button/ui-button';
import { FormField } from '../../../shared/ui/molecules/form-field/form-field';
import { TextareaField } from '../../../shared/ui/molecules/textarea-field/textarea-field';
import { UiModal } from '../../../shared/ui/molecules/ui-modal/ui-modal';
import { DataTable, DataTableColumn } from '../../../shared/ui/organisms/data-table/data-table';
import { ConfirmDialog } from '../../../shared/ui/organisms/confirm-dialog/confirm-dialog';
import { CursoService } from '../../../core/services/curso.service';
import { ModuloService } from '../../../core/services/modulo.service';
import { ContenidoService } from '../../../core/services/contenido.service';
import { MatriculaService } from '../../../core/services/matricula.service';
import { ActividadService } from '../../../core/services/actividad.service';
import { EntregaService } from '../../../core/services/entrega.service';
import { Curso } from '../../../core/models/curso.model';
import { Modulo } from '../../../core/models/modulo.model';
import { Contenido } from '../../../core/models/contenido.model';
import { Matricula } from '../../../core/models/matricula.model';
import { Actividad } from '../../../core/models/actividad.model';
import { Entrega } from '../../../core/models/entrega.model';
import { extraerMensajeError } from '../../../core/utils/http-error.util';
import { TIPO_CONTENIDO_LABELS, formatearFecha } from '../../../core/utils/labels.util';

interface ModuloConContenidos {
  modulo: Modulo;
  contenidos: Contenido[];
  actividades: Actividad[];
}

type Tab = 'curso' | 'participantes';

@Component({
  selector: 'app-profesor-curso-detalle-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    UiAlert,
    UiButton,
    FormField,
    TextareaField,
    UiModal,
    DataTable,
    ConfirmDialog,
  ],
  templateUrl: './curso-detalle-page.html',
  styleUrl: './curso-detalle-page.scss',
})
export class ProfesorCursoDetallePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly cursoService = inject(CursoService);
  private readonly moduloService = inject(ModuloService);
  private readonly contenidoService = inject(ContenidoService);
  private readonly matriculaService = inject(MatriculaService);
  private readonly actividadService = inject(ActividadService);
  private readonly entregaService = inject(EntregaService);
  private readonly fb = inject(FormBuilder);

  readonly cursoId = Number(this.route.snapshot.paramMap.get('cursoId'));

  readonly curso = signal<Curso | null>(null);
  readonly modulos = signal<ModuloConContenidos[]>([]);
  readonly cargando = signal(false);
  readonly error = signal('');
  readonly actualizandoEstado = signal(false);

  readonly tipoLabels = TIPO_CONTENIDO_LABELS;
  readonly formatearFecha = formatearFecha;

  readonly tabActiva = signal<Tab>('curso');
  readonly participantes = signal<Matricula[]>([]);
  readonly cargandoParticipantes = signal(false);
  private participantesCargados = false;

  readonly participantesColumnas: DataTableColumn<Matricula>[] = [
    { key: 'nombre', label: 'Nombre', format: (m) => m.estudianteNombre || `Estudiante #${m.estudianteId}` },
    { key: 'email', label: 'Correo', format: (m) => m.estudianteEmail ?? '—' },
    { key: 'fecha', label: 'Matriculado', format: (m) => formatearFecha(m.fechaMatricula) },
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
      format: (e) => (e.nota != null ? `${e.nota} / ${this.actividadEntregas()?.puntajeMaximo ?? ''}` : 'Sin calificar'),
    },
  ];

  readonly calificarModalAbierto = signal(false);
  readonly entregaCalificando = signal<Entrega | null>(null);
  readonly guardandoCalificacion = signal(false);

  readonly calificarForm = this.fb.group({
    nota: [0, [Validators.required, Validators.min(0)]],
    comentario: [''],
  });

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
        const ordenados = [...modulos].sort((a, b) => a.orden - b.orden);

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
            }),
          ),
        ).subscribe({
          next: (resultados) => {
            this.modulos.set(
              ordenados.map((modulo, i) => ({
                modulo,
                contenidos: resultados[i].contenidos,
                actividades: resultados[i].actividades,
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

  togglePublicado(): void {
    const curso = this.curso();
    if (!curso) {
      return;
    }
    this.actualizandoEstado.set(true);
    this.error.set('');
    this.cursoService
      .actualizar(curso.id, {
        titulo: curso.titulo,
        descripcion: curso.descripcion,
        publicado: !curso.publicado,
      })
      .subscribe({
        next: (actualizado) => {
          this.curso.set(actualizado);
          this.actualizandoEstado.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.actualizandoEstado.set(false);
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
}

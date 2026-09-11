import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
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
import { BloqueService } from '../../../core/services/bloque.service';
import { Curso } from '../../../core/models/curso.model';
import { Modulo } from '../../../core/models/modulo.model';
import { Contenido } from '../../../core/models/contenido.model';
import { Matricula } from '../../../core/models/matricula.model';
import { Actividad } from '../../../core/models/actividad.model';
import { Entrega } from '../../../core/models/entrega.model';
import { Bloque, TipoBloque } from '../../../core/models/bloque.model';
import { extraerMensajeError } from '../../../core/utils/http-error.util';
import { TIPO_CONTENIDO_LABELS, formatearFecha } from '../../../core/utils/labels.util';

interface ModuloConContenidos {
  modulo: Modulo;
  contenidos: Contenido[];
  actividades: Actividad[];
  bloques: Bloque[];
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
  private readonly bloqueService = inject(BloqueService);
  private readonly sanitizer = inject(DomSanitizer);
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

  // --- Módulos ---
  readonly moduloModalAbierto = signal(false);
  readonly moduloModoEdicion = signal(false);
  readonly moduloEditando = signal<Modulo | null>(null);
  readonly guardandoModulo = signal(false);

  readonly moduloForm = this.fb.group({
    titulo: ['', [Validators.required]],
    orden: [1, [Validators.required, Validators.min(1)]],
  });

  readonly confirmEliminarModuloAbierto = signal(false);
  readonly moduloAEliminar = signal<Modulo | null>(null);
  readonly eliminandoModulo = signal(false);

  // --- Bloques (editor de contenido) ---
  readonly agregandoTextoEnModulo = signal<number | null>(null);
  readonly nuevoTextoValor = signal('');
  readonly agregandoVideoEnModulo = signal<number | null>(null);
  readonly nuevoVideoValor = signal('');
  readonly subiendoArchivoBloque = signal<number | null>(null);

  readonly bloqueEditandoId = signal<number | null>(null);
  readonly textoEditandoValor = signal('');
  readonly guardandoBloque = signal(false);

  readonly confirmEliminarBloqueAbierto = signal(false);
  readonly bloqueAEliminar = signal<Bloque | null>(null);
  readonly eliminandoBloque = signal(false);

  private arrastrando: { moduloId: number; bloqueId: number } | null = null;

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
              bloques: this.bloqueService.listarPorModulo(m.id),
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

  // --- Módulos ---

  abrirCrearModulo(): void {
    this.moduloModoEdicion.set(false);
    this.moduloEditando.set(null);
    const siguienteOrden = this.modulos().length + 1;
    this.moduloForm.reset({ titulo: '', orden: siguienteOrden });
    this.moduloModalAbierto.set(true);
  }

  abrirEditarModulo(modulo: Modulo): void {
    this.moduloModoEdicion.set(true);
    this.moduloEditando.set(modulo);
    this.moduloForm.reset({ titulo: modulo.titulo, orden: modulo.orden });
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

    this.guardandoModulo.set(true);
    this.error.set('');
    const valores = this.moduloForm.getRawValue();
    const datos = { titulo: valores.titulo!, orden: Number(valores.orden) };

    const editando = this.moduloModoEdicion() ? this.moduloEditando() : null;
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

  // --- Bloques (editor de contenido) ---

  embedVideoUrl(url: string): SafeResourceUrl {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{11})/);
    const embed = match ? `https://www.youtube.com/embed/${match[1]}` : url;
    return this.sanitizer.bypassSecurityTrustResourceUrl(embed);
  }

  private actualizarBloquesDelModulo(moduloId: number, bloques: Bloque[]): void {
    this.modulos.set(
      this.modulos().map((item) => (item.modulo.id === moduloId ? { ...item, bloques } : item)),
    );
  }

  abrirAgregarTexto(moduloId: number): void {
    this.agregandoVideoEnModulo.set(null);
    this.agregandoTextoEnModulo.set(moduloId);
    this.nuevoTextoValor.set('');
  }

  cancelarAgregarTexto(): void {
    this.agregandoTextoEnModulo.set(null);
  }

  guardarNuevoTexto(moduloId: number): void {
    const texto = this.nuevoTextoValor().trim();
    if (!texto) {
      return;
    }
    this.guardandoBloque.set(true);
    this.error.set('');
    this.bloqueService.crearTexto(moduloId, texto).subscribe({
      next: (bloque) => {
        this.guardandoBloque.set(false);
        this.agregandoTextoEnModulo.set(null);
        const item = this.modulos().find((m) => m.modulo.id === moduloId);
        this.actualizarBloquesDelModulo(moduloId, [...(item?.bloques ?? []), bloque]);
      },
      error: (err: HttpErrorResponse) => {
        this.guardandoBloque.set(false);
        this.error.set(extraerMensajeError(err));
      },
    });
  }

  abrirAgregarVideo(moduloId: number): void {
    this.agregandoTextoEnModulo.set(null);
    this.agregandoVideoEnModulo.set(moduloId);
    this.nuevoVideoValor.set('');
  }

  cancelarAgregarVideo(): void {
    this.agregandoVideoEnModulo.set(null);
  }

  guardarNuevoVideo(moduloId: number): void {
    const url = this.nuevoVideoValor().trim();
    if (!url) {
      return;
    }
    this.guardandoBloque.set(true);
    this.error.set('');
    this.bloqueService.crearVideo(moduloId, url).subscribe({
      next: (bloque) => {
        this.guardandoBloque.set(false);
        this.agregandoVideoEnModulo.set(null);
        const item = this.modulos().find((m) => m.modulo.id === moduloId);
        this.actualizarBloquesDelModulo(moduloId, [...(item?.bloques ?? []), bloque]);
      },
      error: (err: HttpErrorResponse) => {
        this.guardandoBloque.set(false);
        this.error.set(extraerMensajeError(err));
      },
    });
  }

  onArchivoBloqueSeleccionado(evento: Event, moduloId: number, tipo: Extract<TipoBloque, 'IMAGEN' | 'ARCHIVO'>): void {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0];
    if (!archivo) {
      return;
    }
    this.subiendoArchivoBloque.set(moduloId);
    this.error.set('');
    this.bloqueService.subirArchivo(moduloId, tipo, archivo).subscribe({
      next: (bloque) => {
        this.subiendoArchivoBloque.set(null);
        input.value = '';
        const item = this.modulos().find((m) => m.modulo.id === moduloId);
        this.actualizarBloquesDelModulo(moduloId, [...(item?.bloques ?? []), bloque]);
      },
      error: (err: HttpErrorResponse) => {
        this.subiendoArchivoBloque.set(null);
        input.value = '';
        this.error.set(extraerMensajeError(err));
      },
    });
  }

  verBloque(bloque: Bloque): void {
    this.error.set('');
    this.bloqueService.obtenerUrl(bloque.id).subscribe({
      next: (respuesta) => window.open(respuesta.url, '_blank', 'noopener'),
      error: (err: HttpErrorResponse) => this.error.set(extraerMensajeError(err)),
    });
  }

  abrirEditarBloqueTexto(bloque: Bloque): void {
    this.bloqueEditandoId.set(bloque.id);
    this.textoEditandoValor.set(bloque.texto ?? '');
  }

  cancelarEditarBloqueTexto(): void {
    this.bloqueEditandoId.set(null);
  }

  guardarEdicionBloqueTexto(moduloId: number): void {
    const id = this.bloqueEditandoId();
    const texto = this.textoEditandoValor().trim();
    if (id == null || !texto) {
      return;
    }
    this.guardandoBloque.set(true);
    this.error.set('');
    this.bloqueService.actualizarTexto(id, texto).subscribe({
      next: (actualizado) => {
        this.guardandoBloque.set(false);
        this.bloqueEditandoId.set(null);
        const item = this.modulos().find((m) => m.modulo.id === moduloId);
        this.actualizarBloquesDelModulo(
          moduloId,
          (item?.bloques ?? []).map((b) => (b.id === actualizado.id ? actualizado : b)),
        );
      },
      error: (err: HttpErrorResponse) => {
        this.guardandoBloque.set(false);
        this.error.set(extraerMensajeError(err));
      },
    });
  }

  pedirEliminarBloque(bloque: Bloque): void {
    this.bloqueAEliminar.set(bloque);
    this.confirmEliminarBloqueAbierto.set(true);
  }

  confirmarEliminarBloque(): void {
    const bloque = this.bloqueAEliminar();
    if (!bloque) {
      return;
    }
    this.eliminandoBloque.set(true);
    this.bloqueService.eliminar(bloque.id).subscribe({
      next: () => {
        this.eliminandoBloque.set(false);
        this.confirmEliminarBloqueAbierto.set(false);
        const item = this.modulos().find((m) => m.modulo.id === bloque.moduloId);
        this.actualizarBloquesDelModulo(
          bloque.moduloId,
          (item?.bloques ?? []).filter((b) => b.id !== bloque.id),
        );
      },
      error: (err: HttpErrorResponse) => {
        this.eliminandoBloque.set(false);
        this.confirmEliminarBloqueAbierto.set(false);
        this.error.set(extraerMensajeError(err));
      },
    });
  }

  arrastrarInicio(moduloId: number, bloqueId: number): void {
    this.arrastrando = { moduloId, bloqueId };
  }

  permitirSoltar(evento: DragEvent): void {
    evento.preventDefault();
  }

  soltarSobre(moduloId: number, bloqueDestinoId: number): void {
    if (!this.arrastrando || this.arrastrando.moduloId !== moduloId || this.arrastrando.bloqueId === bloqueDestinoId) {
      this.arrastrando = null;
      return;
    }
    const item = this.modulos().find((m) => m.modulo.id === moduloId);
    if (!item) {
      this.arrastrando = null;
      return;
    }

    const bloques = [...item.bloques];
    const origenIdx = bloques.findIndex((b) => b.id === this.arrastrando!.bloqueId);
    const destinoIdx = bloques.findIndex((b) => b.id === bloqueDestinoId);
    if (origenIdx === -1 || destinoIdx === -1) {
      this.arrastrando = null;
      return;
    }

    const [movido] = bloques.splice(origenIdx, 1);
    bloques.splice(destinoIdx, 0, movido);
    this.arrastrando = null;

    this.actualizarBloquesDelModulo(moduloId, bloques);
    this.bloqueService.reordenar(moduloId, bloques.map((b) => b.id)).subscribe({
      error: (err: HttpErrorResponse) => {
        this.error.set(extraerMensajeError(err));
        this.cargar();
      },
    });
  }
}

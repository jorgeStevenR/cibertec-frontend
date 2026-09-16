import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { FormField } from '../../../shared/ui/molecules/form-field/form-field';
import { SelectField } from '../../../shared/ui/molecules/select-field/select-field';
import { UiModal } from '../../../shared/ui/molecules/ui-modal/ui-modal';
import { UiButton } from '../../../shared/ui/atoms/ui-button/ui-button';
import { UiAlert } from '../../../shared/ui/atoms/ui-alert/ui-alert';
import { UiSelectOption } from '../../../shared/ui/atoms/ui-select/ui-select';
import { DataTable, DataTableColumn } from '../../../shared/ui/organisms/data-table/data-table';
import { ConfirmDialog } from '../../../shared/ui/organisms/confirm-dialog/confirm-dialog';
import { LienzoComponent } from '../../../shared/ui/organisms/lienzo/lienzo';
import { EmbedVideoUrlPipe } from '../../../shared/pipes/embed-video-url.pipe';
import { CursoService } from '../../../core/services/curso.service';
import { ModuloService } from '../../../core/services/modulo.service';
import { ContenidoService } from '../../../core/services/contenido.service';
import { BloqueService } from '../../../core/services/bloque.service';
import { ActividadService } from '../../../core/services/actividad.service';
import { CuestionarioService } from '../../../core/services/cuestionario.service';
import { Curso } from '../../../core/models/curso.model';
import { Modulo } from '../../../core/models/modulo.model';
import { Contenido, TipoContenido } from '../../../core/models/contenido.model';
import { Bloque } from '../../../core/models/bloque.model';
import { Actividad } from '../../../core/models/actividad.model';
import { Cuestionario } from '../../../core/models/cuestionario.model';
import { extraerMensajeError } from '../../../core/utils/http-error.util';
import { TIPO_CONTENIDO_LABELS, formatearFecha } from '../../../core/utils/labels.util';

@Component({
  selector: 'app-modulo-detalle-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    FormField,
    SelectField,
    UiModal,
    UiButton,
    UiAlert,
    DataTable,
    ConfirmDialog,
    LienzoComponent,
    EmbedVideoUrlPipe,
  ],
  templateUrl: './modulo-detalle-page.html',
  styleUrl: './modulo-detalle-page.scss',
})
export class ModuloDetallePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly cursoService = inject(CursoService);
  private readonly moduloService = inject(ModuloService);
  private readonly contenidoService = inject(ContenidoService);
  private readonly bloqueService = inject(BloqueService);
  private readonly actividadService = inject(ActividadService);
  private readonly cuestionarioService = inject(CuestionarioService);
  private readonly fb = inject(FormBuilder);

  readonly cursoId = Number(this.route.snapshot.paramMap.get('cursoId'));
  readonly moduloId = Number(this.route.snapshot.paramMap.get('moduloId'));

  readonly curso = signal<Curso | null>(null);
  readonly modulo = signal<Modulo | null>(null);
  readonly contenidos = signal<Contenido[]>([]);
  readonly bloques = signal<Bloque[]>([]);
  readonly actividades = signal<Actividad[]>([]);
  readonly cuestionarios = signal<Cuestionario[]>([]);
  readonly cuestionariosError = signal(false);
  readonly cargando = signal(false);
  readonly error = signal('');

  readonly lienzoAbierto = signal(false);
  readonly personajeImagenUrls = signal<Record<number, string>>({});
  readonly personajeFraseIndice = signal<Record<number, number>>({});
  readonly formatearFecha = formatearFecha;

  readonly columnas: DataTableColumn<Contenido>[] = [
    { key: 'nombre', label: 'Nombre' },
    { key: 'tipo', label: 'Tipo', format: (c) => TIPO_CONTENIDO_LABELS[c.tipo] },
    { key: 'visible', label: 'Visibilidad', badge: (c) => c.visible, badgeLabels: ['Visible', 'Oculto'] },
    { key: 'fechaSubida', label: 'Subido', format: (c) => formatearFecha(c.fechaSubida) },
  ];

  readonly opcionesTipoArchivo: UiSelectOption[] = [
    { value: 'VIDEO', label: 'Video' },
    { value: 'PDF', label: 'PDF' },
    { value: 'DOCUMENTO', label: 'Documento' },
  ];

  readonly subirModalAbierto = signal(false);
  readonly subiendo = signal(false);
  readonly archivoSeleccionado = signal<File | null>(null);
  readonly archivoFaltante = signal(false);

  readonly subirForm = this.fb.group({
    tipo: ['', [Validators.required]],
  });

  readonly enlaceModalAbierto = signal(false);
  readonly guardandoEnlace = signal(false);

  readonly enlaceForm = this.fb.group({
    nombre: ['', [Validators.required]],
    url: ['', [Validators.required]],
  });

  readonly confirmEliminarAbierto = signal(false);
  readonly contenidoAEliminar = signal<Contenido | null>(null);
  readonly eliminando = signal(false);

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    forkJoin({
      curso: this.cursoService.obtener(this.cursoId),
      modulo: this.moduloService.obtener(this.moduloId),
      contenidos: this.contenidoService.listarPorModulo(this.moduloId),
      bloques: this.bloqueService.listarPorModulo(this.moduloId),
      actividades: this.actividadService.listarPorModulo(this.moduloId),
      // Si el backend de cuestionarios falla, no debe tumbar el resto del módulo
      // (bloques/actividades/contenidos siguen funcionando bien) — mismo patrón
      // defensivo que EstudianteCursoDetallePage.cargar().
      cuestionarios: this.cuestionarioService.listarPorModulo(this.moduloId).pipe(
        catchError((err: HttpErrorResponse) => {
          console.error(`Fallo al cargar cuestionarios del módulo ${this.moduloId}`, err);
          this.cuestionariosError.set(true);
          return of([] as Cuestionario[]);
        }),
      ),
    }).subscribe({
      next: ({ curso, modulo, contenidos, bloques, actividades, cuestionarios }) => {
        this.curso.set(curso);
        this.modulo.set(modulo);
        this.contenidos.set(contenidos);
        this.bloques.set(bloques);
        this.actividades.set(actividades);
        this.cuestionarios.set(cuestionarios);
        this.cargando.set(false);
        this.cargarImagenesPersonaje(bloques.filter((b) => b.tipo === 'PERSONAJE'));
      },
      error: (err: HttpErrorResponse) => {
        this.cargando.set(false);
        this.error.set(extraerMensajeError(err));
      },
    });
  }

  ver(contenido: Contenido): void {
    this.error.set('');
    this.contenidoService.obtenerUrl(contenido.id).subscribe({
      next: (respuesta) => window.open(respuesta.url, '_blank', 'noopener'),
      error: (err: HttpErrorResponse) => this.error.set(extraerMensajeError(err)),
    });
  }

  verBloque(bloque: Bloque): void {
    this.error.set('');
    this.bloqueService.obtenerUrl(bloque.id).subscribe({
      next: (respuesta) => window.open(respuesta.url, '_blank', 'noopener'),
      error: (err: HttpErrorResponse) => this.error.set(extraerMensajeError(err)),
    });
  }

  private cargarImagenesPersonaje(bloques: Bloque[]): void {
    for (const bloque of bloques) {
      this.bloqueService.obtenerUrl(bloque.id).subscribe({
        next: (respuesta) => {
          this.personajeImagenUrls.set({ ...this.personajeImagenUrls(), [bloque.id]: respuesta.url });
        },
      });
    }
  }

  frasesPersonaje(bloque: Bloque): string[] {
    return (bloque.texto ?? '')
      .split('\n')
      .map((f) => f.trim())
      .filter((f) => f.length > 0);
  }

  fraseActualPersonaje(bloque: Bloque): string {
    const frases = this.frasesPersonaje(bloque);
    if (frases.length === 0) {
      return '';
    }
    const indice = this.personajeFraseIndice()[bloque.id] ?? 0;
    return frases[Math.min(indice, frases.length - 1)];
  }

  siguienteFrasePersonaje(bloque: Bloque): void {
    const frases = this.frasesPersonaje(bloque);
    const actual = this.personajeFraseIndice()[bloque.id] ?? 0;
    const siguiente = actual + 1 >= frases.length ? 0 : actual + 1;
    this.personajeFraseIndice.set({ ...this.personajeFraseIndice(), [bloque.id]: siguiente });
  }

  abrirLienzo(): void {
    this.lienzoAbierto.set(true);
  }

  cerrarLienzo(): void {
    this.lienzoAbierto.set(false);
  }

  toggleVisibilidad(contenido: Contenido): void {
    this.error.set('');
    this.contenidoService.cambiarVisibilidad(contenido.id, !contenido.visible).subscribe({
      next: () => this.cargar(),
      error: (err: HttpErrorResponse) => this.error.set(extraerMensajeError(err)),
    });
  }

  pedirEliminar(contenido: Contenido): void {
    this.contenidoAEliminar.set(contenido);
    this.confirmEliminarAbierto.set(true);
  }

  confirmarEliminar(): void {
    const contenido = this.contenidoAEliminar();
    if (!contenido) {
      return;
    }

    this.eliminando.set(true);
    this.contenidoService.eliminar(contenido.id).subscribe({
      next: () => {
        this.eliminando.set(false);
        this.confirmEliminarAbierto.set(false);
        this.cargar();
      },
      error: (err: HttpErrorResponse) => {
        this.eliminando.set(false);
        this.confirmEliminarAbierto.set(false);
        this.error.set(extraerMensajeError(err));
      },
    });
  }

  // --- Subir archivo ---

  abrirSubir(): void {
    this.subirForm.reset({ tipo: '' });
    this.archivoSeleccionado.set(null);
    this.archivoFaltante.set(false);
    this.subirModalAbierto.set(true);
  }

  cerrarModalSubir(): void {
    this.subirModalAbierto.set(false);
  }

  onArchivoSeleccionado(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    this.archivoSeleccionado.set(input.files?.[0] ?? null);
    this.archivoFaltante.set(false);
  }

  subirArchivo(): void {
    if (this.subirForm.invalid || !this.archivoSeleccionado()) {
      this.subirForm.markAllAsTouched();
      this.archivoFaltante.set(!this.archivoSeleccionado());
      return;
    }

    this.subiendo.set(true);
    this.error.set('');
    const tipo = this.subirForm.getRawValue().tipo as Exclude<TipoContenido, 'ENLACE'>;

    this.contenidoService.subirArchivo(this.moduloId, tipo, this.archivoSeleccionado()!).subscribe({
      next: () => {
        this.subiendo.set(false);
        this.subirModalAbierto.set(false);
        this.cargar();
      },
      error: (err: HttpErrorResponse) => {
        this.subiendo.set(false);
        this.error.set(extraerMensajeError(err));
      },
    });
  }

  // --- Agregar enlace ---

  abrirEnlace(): void {
    this.enlaceForm.reset({ nombre: '', url: '' });
    this.enlaceModalAbierto.set(true);
  }

  cerrarModalEnlace(): void {
    this.enlaceModalAbierto.set(false);
  }

  agregarEnlace(): void {
    if (this.enlaceForm.invalid) {
      this.enlaceForm.markAllAsTouched();
      return;
    }

    this.guardandoEnlace.set(true);
    this.error.set('');
    const valores = this.enlaceForm.getRawValue();

    this.contenidoService.agregarEnlace(this.moduloId, { nombre: valores.nombre!, url: valores.url! }).subscribe({
      next: () => {
        this.guardandoEnlace.set(false);
        this.enlaceModalAbierto.set(false);
        this.cargar();
      },
      error: (err: HttpErrorResponse) => {
        this.guardandoEnlace.set(false);
        this.error.set(extraerMensajeError(err));
      },
    });
  }
}

import { CommonModule, DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, Injector, afterNextRender, computed, inject, input, output, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { UiAlert } from '../../atoms/ui-alert/ui-alert';
import { UiButton } from '../../atoms/ui-button/ui-button';
import { UiModal } from '../../molecules/ui-modal/ui-modal';
import { BloqueVista } from '../../molecules/bloque-vista/bloque-vista';
import { ConfirmDialog } from '../confirm-dialog/confirm-dialog';
import { BloqueService } from '../../../../core/services/bloque.service';
import { Bloque, ContenedorBloques, TipoBloque } from '../../../../core/models/bloque.model';
import { extraerMensajeError } from '../../../../core/utils/http-error.util';
import { moverElemento } from '../../../../core/utils/orden.util';

type TipoArchivo = Extract<TipoBloque, 'IMAGEN' | 'ARCHIVO'>;
type TipoModal = Exclude<TipoBloque, 'TEXTO'>;

const TITULOS_MODAL: Record<TipoModal, string> = {
  VIDEO: 'Agregar video',
  IMAGEN: 'Agregar imagen',
  ARCHIVO: 'Agregar archivo',
};

/**
 * Editor de bloques apilados (texto, imagen, video, archivo) de un módulo o de
 * una página. Es controlado: recibe `bloques` y emite `bloquesChange` con la
 * lista nueva después de cada cambio confirmado por el backend.
 */
@Component({
  selector: 'app-bloques-editor',
  standalone: true,
  imports: [CommonModule, UiAlert, UiButton, UiModal, BloqueVista, ConfirmDialog],
  templateUrl: './bloques-editor.html',
  styleUrl: './bloques-editor.scss',
})
export class BloquesEditor {
  readonly contenedor = input.required<ContenedorBloques>();
  readonly bloques = input.required<Bloque[]>();
  // En el módulo se agrega desde el selector de recursos; en una página, con esta barra.
  readonly mostrarBarraAgregar = input(false);
  readonly bloquesChange = output<Bloque[]>();

  private readonly bloqueService = inject(BloqueService);
  private readonly documento = inject(DOCUMENT);
  private readonly injector = inject(Injector);

  // Prefijo para ids de elementos: puede haber varios editores en la misma pantalla.
  readonly idBase = computed(() => `bloques-${this.contenedor().tipo}-${this.contenedor().id}`);

  readonly error = signal('');
  readonly guardando = signal(false);
  readonly subiendo = signal(false);
  readonly archivoEncima = signal(false);

  readonly textoNuevoAbierto = signal(false);
  readonly textoNuevo = signal('');

  readonly modalTipo = signal<TipoModal | null>(null);
  readonly videoUrl = signal('');
  readonly titulosModal = TITULOS_MODAL;

  readonly editandoId = signal<number | null>(null);
  readonly textoEditando = signal('');

  readonly bloqueAEliminar = signal<Bloque | null>(null);
  readonly eliminando = signal(false);

  private arrastrandoId: number | null = null;

  porId(_: number, bloque: Bloque): number {
    return bloque.id;
  }

  // --- Agregar ---

  /** Punto de entrada desde afuera (ej. el selector de recursos del módulo). */
  iniciarAgregar(tipo: TipoBloque): void {
    if (tipo === 'TEXTO') {
      this.abrirTextoNuevo();
    } else {
      this.videoUrl.set('');
      this.modalTipo.set(tipo);
    }
  }

  private abrirTextoNuevo(): void {
    this.textoNuevo.set('');
    this.textoNuevoAbierto.set(true);
    afterNextRender(
      () => {
        const campo = this.documento.getElementById(`${this.idBase()}-texto-nuevo`);
        campo?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        campo?.focus({ preventScroll: true });
      },
      { injector: this.injector },
    );
  }

  cancelarTextoNuevo(): void {
    this.textoNuevoAbierto.set(false);
  }

  guardarTextoNuevo(): void {
    const texto = this.textoNuevo().trim();
    if (!texto) {
      return;
    }
    this.crear(this.bloqueService.crearTexto(this.contenedor(), texto), () => this.textoNuevoAbierto.set(false));
  }

  cerrarModal(): void {
    this.modalTipo.set(null);
  }

  guardarVideo(): void {
    const url = this.videoUrl().trim();
    if (!url) {
      return;
    }
    this.crear(this.bloqueService.crearVideo(this.contenedor(), url), () => this.modalTipo.set(null));
  }

  onArchivoElegido(evento: Event, tipo: TipoArchivo): void {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0];
    if (!archivo) {
      return;
    }
    this.subirArchivo(tipo, archivo, () => {
      input.value = '';
      this.modalTipo.set(null);
    });
  }

  private subirArchivo(tipo: TipoArchivo, archivo: File, alTerminar?: () => void): void {
    this.subiendo.set(true);
    this.error.set('');
    this.bloqueService.subirArchivo(this.contenedor(), tipo, archivo).subscribe({
      next: (bloque) => {
        this.subiendo.set(false);
        alTerminar?.();
        this.bloquesChange.emit([...this.bloques(), bloque]);
      },
      error: (err: HttpErrorResponse) => {
        this.subiendo.set(false);
        alTerminar?.();
        this.error.set(extraerMensajeError(err));
      },
    });
  }

  private crear(peticion: Observable<Bloque>, alTerminar?: () => void): void {
    this.guardando.set(true);
    this.error.set('');
    peticion.subscribe({
      next: (bloque) => {
        this.guardando.set(false);
        alTerminar?.();
        this.bloquesChange.emit([...this.bloques(), bloque]);
      },
      error: (err: HttpErrorResponse) => {
        this.guardando.set(false);
        this.error.set(extraerMensajeError(err));
      },
    });
  }

  // --- Pegar / arrastrar archivos sobre la zona ---

  onDragOverZona(evento: DragEvent): void {
    // Solo se marca la zona cuando lo que se arrastra es un archivo, no un bloque.
    if (evento.dataTransfer?.types.includes('Files')) {
      evento.preventDefault();
      this.archivoEncima.set(true);
    }
  }

  onDragLeaveZona(): void {
    this.archivoEncima.set(false);
  }

  onDropZona(evento: DragEvent): void {
    this.archivoEncima.set(false);
    const archivo = evento.dataTransfer?.files?.[0];
    if (!archivo) {
      return;
    }
    evento.preventDefault();
    this.subirArchivo(archivo.type.startsWith('image/') ? 'IMAGEN' : 'ARCHIVO', archivo);
  }

  onPasteZona(evento: ClipboardEvent): void {
    const target = evento.target as HTMLElement;
    if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') {
      return;
    }

    const items = evento.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (it.kind === 'file' && it.type.startsWith('image/')) {
          evento.preventDefault();
          const archivo = it.getAsFile();
          if (archivo) {
            this.subirArchivo('IMAGEN', archivo);
          }
          return;
        }
      }
    }

    const texto = evento.clipboardData?.getData('text/plain')?.trim();
    if (texto) {
      evento.preventDefault();
      const peticion = /youtu\.?be/i.test(texto)
        ? this.bloqueService.crearVideo(this.contenedor(), texto)
        : this.bloqueService.crearTexto(this.contenedor(), texto);
      this.crear(peticion);
    }
  }

  // --- Editar texto ---

  abrirEditar(bloque: Bloque): void {
    this.editandoId.set(bloque.id);
    this.textoEditando.set(bloque.texto ?? '');
  }

  cancelarEditar(): void {
    this.editandoId.set(null);
  }

  guardarEdicion(): void {
    const id = this.editandoId();
    const texto = this.textoEditando().trim();
    if (id == null || !texto) {
      return;
    }
    this.guardando.set(true);
    this.error.set('');
    this.bloqueService.actualizarTexto(id, texto).subscribe({
      next: (actualizado) => {
        this.guardando.set(false);
        this.editandoId.set(null);
        this.bloquesChange.emit(this.bloques().map((b) => (b.id === actualizado.id ? actualizado : b)));
      },
      error: (err: HttpErrorResponse) => {
        this.guardando.set(false);
        this.error.set(extraerMensajeError(err));
      },
    });
  }

  // --- Eliminar ---

  pedirEliminar(bloque: Bloque): void {
    this.bloqueAEliminar.set(bloque);
  }

  confirmarEliminar(): void {
    const bloque = this.bloqueAEliminar();
    if (!bloque) {
      return;
    }
    this.eliminando.set(true);
    this.error.set('');
    this.bloqueService.eliminar(bloque.id).subscribe({
      next: () => {
        this.eliminando.set(false);
        this.bloqueAEliminar.set(null);
        this.bloquesChange.emit(this.bloques().filter((b) => b.id !== bloque.id));
      },
      error: (err: HttpErrorResponse) => {
        this.eliminando.set(false);
        this.bloqueAEliminar.set(null);
        this.error.set(extraerMensajeError(err));
      },
    });
  }

  // --- Reordenar (arrastrando o con los botones ↑/↓, que sirven con teclado) ---

  arrastrarInicio(bloqueId: number): void {
    this.arrastrandoId = bloqueId;
  }

  permitirSoltar(evento: DragEvent): void {
    if (this.arrastrandoId !== null) {
      evento.preventDefault();
    }
  }

  soltarSobre(bloqueDestinoId: number): void {
    const origenId = this.arrastrandoId;
    this.arrastrandoId = null;
    if (origenId === null || origenId === bloqueDestinoId) {
      return;
    }
    const lista = this.bloques();
    this.aplicarOrden(
      moverElemento(
        lista,
        lista.findIndex((b) => b.id === origenId),
        lista.findIndex((b) => b.id === bloqueDestinoId),
      ),
    );
  }

  mover(indice: number, delta: -1 | 1): void {
    this.aplicarOrden(moverElemento(this.bloques(), indice, indice + delta));
  }

  // Optimista: se muestra el orden nuevo al instante y se revierte si el backend falla.
  private aplicarOrden(nueva: Bloque[]): void {
    const anterior = this.bloques();
    if (nueva.every((b, i) => b.id === anterior[i]?.id)) {
      return;
    }
    this.error.set('');
    this.bloquesChange.emit(nueva);
    this.bloqueService.reordenar(this.contenedor(), nueva.map((b) => b.id)).subscribe({
      next: () => {},
      error: (err: HttpErrorResponse) => {
        this.bloquesChange.emit(anterior);
        this.error.set(extraerMensajeError(err));
      },
    });
  }
}

import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, HostListener, Input, OnInit, Output, inject, signal } from '@angular/core';
import { LienzoService } from '../../../../core/services/lienzo.service';
import { Lienzo, LienzoElemento, LienzoElementoTipo, LienzoResumen } from '../../../../core/models/lienzo.model';
import { extraerMensajeError } from '../../../../core/utils/http-error.util';
import { EmbedVideoUrlPipe } from '../../../pipes/embed-video-url.pipe';

interface ArrastreEstado {
  id: string;
  ultimoX: number;
  ultimoY: number;
}

const LIENZO_VACIO: Lienzo = { ancho: 960, alto: 600, elementos: [] };

@Component({
  selector: 'app-lienzo',
  standalone: true,
  imports: [CommonModule, EmbedVideoUrlPipe],
  templateUrl: './lienzo.html',
  styleUrl: './lienzo.scss',
})
export class LienzoComponent implements OnInit {
  @Input({ required: true }) moduloId!: number;
  @Input() soloLectura = false;
  @Input() tituloModulo = '';
  // Si se pasa, abre directo en esa hoja en vez de la primera (ej. al entrar desde la navegación).
  @Input() paginaInicialId: number | null = null;
  @Output() cerrado = new EventEmitter<void>();

  private readonly lienzoService = inject(LienzoService);

  readonly paginas = signal<LienzoResumen[]>([]);
  readonly paginaActualId = signal<number | null>(null);
  readonly cargandoPaginas = signal(false);
  readonly creandoPagina = signal(false);

  readonly renombrandoPaginaId = signal<number | null>(null);
  readonly renombrandoValor = signal('');
  readonly guardandoNombre = signal(false);

  readonly lienzo = signal<Lienzo>({ ...LIENZO_VACIO });
  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly subiendoImagen = signal(false);
  readonly error = signal('');
  readonly seleccionadoId = signal<string | null>(null);
  readonly sinGuardar = signal(false);

  readonly agregandoPersonaje = signal(false);
  readonly personajeImagenTemp = signal<File | null>(null);
  readonly personajeTextoTemp = signal('');

  readonly agregandoVideo = signal(false);
  readonly videoUrlTemp = signal('');

  readonly personajeFraseIndice = signal<Record<string, number>>({});

  private arrastre: ArrastreEstado | null = null;
  private redimension: ArrastreEstado | null = null;

  ngOnInit(): void {
    this.cargarPaginas();
  }

  private cargarPaginas(): void {
    this.cargandoPaginas.set(true);
    this.error.set('');
    this.lienzoService.listar(this.moduloId).subscribe({
      next: (paginas) => {
        this.paginas.set(paginas);
        this.cargandoPaginas.set(false);
        const inicial = paginas.find((p) => p.id === this.paginaInicialId) ?? paginas[0];
        if (inicial) {
          this.seleccionarPagina(inicial.id);
        } else {
          this.paginaActualId.set(null);
          this.lienzo.set({ ...LIENZO_VACIO });
        }
      },
      error: (err: HttpErrorResponse) => {
        this.cargandoPaginas.set(false);
        this.error.set(extraerMensajeError(err));
      },
    });
  }

  seleccionarPagina(id: number): void {
    this.paginaActualId.set(id);
    this.seleccionadoId.set(null);
    this.sinGuardar.set(false);
    this.cargando.set(true);
    this.error.set('');
    this.lienzoService.obtener(id).subscribe({
      next: (lienzo) => {
        this.lienzo.set(lienzo?.elementos ? lienzo : { ...LIENZO_VACIO });
        this.cargando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        if (err.status === 404) {
          this.lienzo.set({ ...LIENZO_VACIO });
        } else {
          this.error.set(extraerMensajeError(err));
        }
        this.cargando.set(false);
      },
    });
  }

  nuevaPagina(): void {
    if (this.soloLectura) {
      return;
    }
    this.creandoPagina.set(true);
    this.error.set('');
    const nombre = `Hoja ${this.paginas().length + 1}`;
    this.lienzoService.crear(this.moduloId, nombre).subscribe({
      next: (pagina) => {
        this.creandoPagina.set(false);
        this.paginas.set([...this.paginas(), pagina]);
        this.seleccionarPagina(pagina.id);
      },
      error: (err: HttpErrorResponse) => {
        this.creandoPagina.set(false);
        this.error.set(extraerMensajeError(err));
      },
    });
  }

  iniciarRenombrarPagina(pagina: LienzoResumen, evento: Event): void {
    evento.stopPropagation();
    if (this.soloLectura) {
      return;
    }
    this.renombrandoPaginaId.set(pagina.id);
    this.renombrandoValor.set(pagina.nombre);
  }

  cancelarRenombrarPagina(): void {
    this.renombrandoPaginaId.set(null);
  }

  confirmarRenombrarPagina(): void {
    const id = this.renombrandoPaginaId();
    const nombre = this.renombrandoValor().trim();
    if (id == null || !nombre) {
      this.renombrandoPaginaId.set(null);
      return;
    }
    this.guardandoNombre.set(true);
    this.error.set('');
    this.lienzoService.renombrar(id, nombre).subscribe({
      next: (pagina) => {
        this.guardandoNombre.set(false);
        this.renombrandoPaginaId.set(null);
        this.paginas.set(this.paginas().map((p) => (p.id === id ? pagina : p)));
      },
      error: (err: HttpErrorResponse) => {
        this.guardandoNombre.set(false);
        this.renombrandoPaginaId.set(null);
        this.error.set(extraerMensajeError(err));
      },
    });
  }

  eliminarPagina(id: number, evento: Event): void {
    evento.stopPropagation();
    if (this.soloLectura) {
      return;
    }
    if (!confirm('¿Eliminar esta hoja? Se perderá todo su contenido.')) {
      return;
    }
    this.error.set('');
    this.lienzoService.eliminar(id).subscribe({
      next: () => {
        const restantes = this.paginas().filter((p) => p.id !== id);
        this.paginas.set(restantes);
        if (this.paginaActualId() === id) {
          if (restantes.length > 0) {
            this.seleccionarPagina(restantes[0].id);
          } else {
            this.paginaActualId.set(null);
            this.lienzo.set({ ...LIENZO_VACIO });
          }
        }
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(extraerMensajeError(err));
      },
    });
  }

  guardar(): void {
    const id = this.paginaActualId();
    if (id == null) {
      return;
    }
    this.guardando.set(true);
    this.error.set('');
    this.lienzoService.guardar(id, this.lienzo()).subscribe({
      next: (lienzo) => {
        this.guardando.set(false);
        this.sinGuardar.set(false);
        this.lienzo.set(lienzo);
      },
      error: (err: HttpErrorResponse) => {
        this.guardando.set(false);
        this.error.set(extraerMensajeError(err));
      },
    });
  }

  cerrar(): void {
    this.cerrado.emit();
  }

  // --- Selección / z-index ---

  seleccionar(id: string): void {
    if (this.soloLectura) {
      return;
    }
    this.seleccionadoId.set(id);
  }

  deseleccionarFondo(): void {
    if (!this.soloLectura) {
      this.seleccionadoId.set(null);
    }
  }

  elementoSeleccionado(): LienzoElemento | null {
    const id = this.seleccionadoId();
    return this.lienzo().elementos.find((e) => e.id === id) ?? null;
  }

  private traerAlFrente(id: string): void {
    const lienzo = this.lienzo();
    const maxZ = lienzo.elementos.reduce((m, e) => Math.max(m, e.z), 0);
    const elementos = lienzo.elementos.map((e) => (e.id === id ? { ...e, z: maxZ + 1 } : e));
    this.lienzo.set({ ...lienzo, elementos });
  }

  private siguienteZ(): number {
    return this.lienzo().elementos.reduce((m, e) => Math.max(m, e.z), 0) + 1;
  }

  // --- Agregar elementos ---

  private agregarElemento(parcial: Partial<LienzoElemento> & { tipo: LienzoElementoTipo }): void {
    const lienzo = this.lienzo();
    // Los nuevos elementos se ubican en cascada (no siempre en el mismo punto) para
    // que no queden tapados unos con otros si el profesor no los mueve.
    const paso = (lienzo.elementos.length % 8) * 24;
    const nuevo: LienzoElemento = {
      id: crypto.randomUUID(),
      x: 40 + paso,
      y: 40 + paso,
      ancho: 220,
      alto: 120,
      z: this.siguienteZ(),
      ...parcial,
    };
    this.lienzo.set({ ...lienzo, elementos: [...lienzo.elementos, nuevo] });
    this.sinGuardar.set(true);
    this.seleccionar(nuevo.id);
  }

  agregarTexto(): void {
    this.agregarElemento({ tipo: 'TEXTO', texto: 'Escribe aquí…' });
  }

  abrirAgregarVideo(): void {
    this.videoUrlTemp.set('');
    this.agregandoVideo.set(true);
  }

  cancelarAgregarVideo(): void {
    this.agregandoVideo.set(false);
  }

  confirmarAgregarVideo(): void {
    const url = this.videoUrlTemp().trim();
    if (!url) {
      return;
    }
    this.agregarElemento({ tipo: 'VIDEO', videoUrl: url, ancho: 320, alto: 180 });
    this.agregandoVideo.set(false);
  }

  onImagenSeleccionada(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0];
    if (!archivo) {
      return;
    }
    this.subirImagenYCrearElemento(archivo, () => {
      input.value = '';
    });
  }

  private subirImagenYCrearElemento(archivo: File, alTerminar?: () => void): void {
    const paginaId = this.paginaActualId();
    if (paginaId == null) {
      return;
    }
    this.subiendoImagen.set(true);
    this.error.set('');
    this.lienzoService.subirImagen(paginaId, archivo).subscribe({
      next: (r) => {
        this.subiendoImagen.set(false);
        alTerminar?.();
        this.agregarElemento({ tipo: 'IMAGEN', imagenUrl: r.url, ancho: 220, alto: 160 });
      },
      error: (err: HttpErrorResponse) => {
        this.subiendoImagen.set(false);
        alTerminar?.();
        this.error.set(extraerMensajeError(err));
      },
    });
  }

  @HostListener('document:paste', ['$event'])
  onPegarEnLienzo(evento: ClipboardEvent): void {
    if (this.soloLectura || this.paginaActualId() == null) {
      return;
    }
    const target = evento.target as HTMLElement | null;
    if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT')) {
      return;
    }
    const items = evento.clipboardData?.items;
    if (!items) {
      return;
    }
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.kind === 'file' && it.type.startsWith('image/')) {
        evento.preventDefault();
        const archivo = it.getAsFile();
        if (archivo) {
          this.subirImagenYCrearElemento(archivo);
        }
        return;
      }
    }
  }

  abrirAgregarPersonaje(): void {
    this.personajeImagenTemp.set(null);
    this.personajeTextoTemp.set('');
    this.agregandoPersonaje.set(true);
  }

  cancelarAgregarPersonaje(): void {
    this.agregandoPersonaje.set(false);
  }

  onImagenPersonajeTempSeleccionada(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    this.personajeImagenTemp.set(input.files?.[0] ?? null);
  }

  confirmarAgregarPersonaje(): void {
    const archivo = this.personajeImagenTemp();
    const texto = this.personajeTextoTemp().trim();
    const paginaId = this.paginaActualId();
    if (!archivo || !texto || paginaId == null) {
      return;
    }
    this.subiendoImagen.set(true);
    this.error.set('');
    this.lienzoService.subirImagen(paginaId, archivo).subscribe({
      next: (r) => {
        this.subiendoImagen.set(false);
        this.agregarElemento({ tipo: 'PERSONAJE', imagenUrl: r.url, texto, ancho: 260, alto: 170 });
        this.agregandoPersonaje.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.subiendoImagen.set(false);
        this.error.set(extraerMensajeError(err));
      },
    });
  }

  eliminarSeleccionado(): void {
    const id = this.seleccionadoId();
    if (!id) {
      return;
    }
    const lienzo = this.lienzo();
    this.lienzo.set({ ...lienzo, elementos: lienzo.elementos.filter((e) => e.id !== id) });
    this.seleccionadoId.set(null);
    this.sinGuardar.set(true);
  }

  actualizarTexto(id: string, texto: string): void {
    const lienzo = this.lienzo();
    const elementos = lienzo.elementos.map((e) => (e.id === id ? { ...e, texto } : e));
    this.lienzo.set({ ...lienzo, elementos });
    this.sinGuardar.set(true);
  }

  // --- Arrastrar / redimensionar ---

  iniciarArrastre(evento: PointerEvent, id: string): void {
    if (this.soloLectura) {
      return;
    }
    evento.preventDefault();
    evento.stopPropagation();
    this.seleccionar(id);
    this.traerAlFrente(id);
    this.arrastre = { id, ultimoX: evento.clientX, ultimoY: evento.clientY };
  }

  iniciarRedimension(evento: PointerEvent, id: string): void {
    if (this.soloLectura) {
      return;
    }
    evento.preventDefault();
    evento.stopPropagation();
    this.redimension = { id, ultimoX: evento.clientX, ultimoY: evento.clientY };
  }

  @HostListener('window:pointermove', ['$event'])
  onPointerMove(evento: PointerEvent): void {
    if (this.arrastre) {
      const dx = evento.clientX - this.arrastre.ultimoX;
      const dy = evento.clientY - this.arrastre.ultimoY;
      this.arrastre.ultimoX = evento.clientX;
      this.arrastre.ultimoY = evento.clientY;
      this.moverElemento(this.arrastre.id, dx, dy);
    } else if (this.redimension) {
      const dx = evento.clientX - this.redimension.ultimoX;
      const dy = evento.clientY - this.redimension.ultimoY;
      this.redimension.ultimoX = evento.clientX;
      this.redimension.ultimoY = evento.clientY;
      this.redimensionarElemento(this.redimension.id, dx, dy);
    }
  }

  @HostListener('window:pointerup')
  onPointerUp(): void {
    if (this.arrastre || this.redimension) {
      this.sinGuardar.set(true);
    }
    this.arrastre = null;
    this.redimension = null;
  }

  private moverElemento(id: string, dx: number, dy: number): void {
    const lienzo = this.lienzo();
    const elementos = lienzo.elementos.map((e) => {
      if (e.id !== id) {
        return e;
      }
      const x = Math.max(0, Math.min(lienzo.ancho - e.ancho, e.x + dx));
      const y = Math.max(0, Math.min(lienzo.alto - e.alto, e.y + dy));
      return { ...e, x, y };
    });
    this.lienzo.set({ ...lienzo, elementos });
  }

  private redimensionarElemento(id: string, dx: number, dy: number): void {
    const lienzo = this.lienzo();
    const elementos = lienzo.elementos.map((e) => {
      if (e.id !== id) {
        return e;
      }
      const ancho = Math.max(40, Math.min(lienzo.ancho - e.x, e.ancho + dx));
      const alto = Math.max(40, Math.min(lienzo.alto - e.y, e.alto + dy));
      return { ...e, ancho, alto };
    });
    this.lienzo.set({ ...lienzo, elementos });
  }

  // --- Personaje: frases en modo lectura ---

  frasesPersonaje(elemento: LienzoElemento): string[] {
    return (elemento.texto ?? '')
      .split('\n')
      .map((f) => f.trim())
      .filter((f) => f.length > 0);
  }

  fraseActualPersonaje(elemento: LienzoElemento): string {
    const frases = this.frasesPersonaje(elemento);
    if (frases.length === 0) {
      return '';
    }
    const indice = this.personajeFraseIndice()[elemento.id] ?? 0;
    return frases[Math.min(indice, frases.length - 1)];
  }

  siguienteFrasePersonaje(elemento: LienzoElemento): void {
    const frases = this.frasesPersonaje(elemento);
    const actual = this.personajeFraseIndice()[elemento.id] ?? 0;
    const siguiente = actual + 1 >= frases.length ? 0 : actual + 1;
    this.personajeFraseIndice.set({ ...this.personajeFraseIndice(), [elemento.id]: siguiente });
  }

  trackByElementoId(_index: number, el: LienzoElemento): string {
    return el.id;
  }

  trackByPaginaId(_index: number, p: LienzoResumen): number {
    return p.id;
  }

  // --- Paginación (vista del estudiante) ---

  private indicePaginaActual(): number {
    return this.paginas().findIndex((p) => p.id === this.paginaActualId());
  }

  hayPaginaAnterior(): boolean {
    return this.indicePaginaActual() > 0;
  }

  hayPaginaSiguiente(): boolean {
    const i = this.indicePaginaActual();
    return i >= 0 && i < this.paginas().length - 1;
  }

  paginaAnterior(): void {
    const i = this.indicePaginaActual();
    if (i > 0) {
      this.seleccionarPagina(this.paginas()[i - 1].id);
    }
  }

  paginaSiguiente(): void {
    const i = this.indicePaginaActual();
    if (i >= 0 && i < this.paginas().length - 1) {
      this.seleccionarPagina(this.paginas()[i + 1].id);
    }
  }
}

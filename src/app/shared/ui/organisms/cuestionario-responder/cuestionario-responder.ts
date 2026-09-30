import { CommonModule, DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { ConfirmDialog } from '../confirm-dialog/confirm-dialog';
import { CuestionarioService } from '../../../../core/services/cuestionario.service';
import { CuestionarioDetalle, IntentoDetalle } from '../../../../core/models/cuestionario.model';
import { extraerMensajeError } from '../../../../core/utils/http-error.util';
import { formatearFecha } from '../../../../core/utils/labels.util';

@Component({
  selector: 'app-cuestionario-responder',
  standalone: true,
  imports: [CommonModule, ConfirmDialog],
  templateUrl: './cuestionario-responder.html',
  styleUrl: './cuestionario-responder.scss',
})
export class CuestionarioResponderComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input({ required: true }) cuestionarioId!: number;
  @Input() titulo = 'Cuestionario';
  @Output() cerrado = new EventEmitter<void>();
  // Se emite al enviar las respuestas, para que la lista refleje el estado sin recargar todo.
  @Output() respondido = new EventEmitter<IntentoDetalle>();

  @ViewChild('botonCerrar') private botonCerrar?: ElementRef<HTMLButtonElement>;

  private readonly cuestionarioService = inject(CuestionarioService);
  private readonly documento = inject(DOCUMENT);
  // Elemento que abrió el overlay, para devolverle el foco al cerrarlo.
  private readonly focoPrevio = this.documento.activeElement as HTMLElement | null;

  readonly formatearFecha = formatearFecha;

  readonly cargando = signal(false);
  readonly error = signal('');

  readonly cuestionario = signal<CuestionarioDetalle | null>(null);
  readonly miIntento = signal<IntentoDetalle | null>(null);

  readonly respuestas = signal<Record<number, number>>({});
  readonly confirmEnviarAbierto = signal(false);
  readonly enviando = signal(false);

  ngOnInit(): void {
    this.cargar();
  }

  ngAfterViewInit(): void {
    this.botonCerrar?.nativeElement.focus();
  }

  ngOnDestroy(): void {
    this.focoPrevio?.focus();
  }

  // Escape cierra el overlay, salvo que esté abierta la confirmación de envío.
  @HostListener('document:keydown.escape')
  cerrarConEscape(): void {
    if (this.confirmEnviarAbierto()) {
      return;
    }
    this.cerrar();
  }

  private cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    this.cuestionarioService.obtenerMiIntento(this.cuestionarioId).subscribe({
      next: (intento) => {
        if (intento) {
          this.miIntento.set(intento);
          this.cargando.set(false);
        } else {
          this.cuestionarioService.obtener(this.cuestionarioId).subscribe({
            next: (detalle) => {
              this.cuestionario.set(detalle);
              this.cargando.set(false);
            },
            error: (err: HttpErrorResponse) => {
              this.cargando.set(false);
              this.error.set(extraerMensajeError(err));
            },
          });
        }
      },
      error: (err: HttpErrorResponse) => {
        this.cargando.set(false);
        this.error.set(extraerMensajeError(err));
      },
    });
  }

  cerrar(): void {
    this.cerrado.emit();
  }

  elegirOpcion(preguntaId: number, opcionId: number): void {
    this.respuestas.set({ ...this.respuestas(), [preguntaId]: opcionId });
  }

  totalPreguntas(): number {
    return this.cuestionario()?.preguntas.length ?? 0;
  }

  // "disponible" ausente/null se trata como disponible (fail-open) — así un
  // backend que todavía no manda ese campo no deja inaccesibles todos los
  // cuestionarios. Solo un "false" explícito activa los estados de abajo.
  private estaDisponible(): boolean {
    return this.cuestionario()?.disponible !== false;
  }

  // Todavía no llegó la fecha de apertura: el backend no manda preguntas.
  noAbierto(): boolean {
    const c = this.cuestionario();
    return !!c && !this.estaDisponible() && c.preguntas.length === 0;
  }

  // Ya pasó la fecha de entrega: el backend sí manda las preguntas para
  // revisar, pero no se puede responder.
  vencido(): boolean {
    const c = this.cuestionario();
    return !!c && !this.estaDisponible() && c.preguntas.length > 0;
  }

  totalRespondidas(): number {
    return Object.keys(this.respuestas()).length;
  }

  puedeEnviar(): boolean {
    return this.totalPreguntas() > 0 && this.totalRespondidas() === this.totalPreguntas();
  }

  pedirEnviar(): void {
    if (!this.puedeEnviar()) {
      return;
    }
    this.confirmEnviarAbierto.set(true);
  }

  confirmarEnviar(): void {
    const cuestionario = this.cuestionario();
    if (!cuestionario) {
      return;
    }
    this.enviando.set(true);
    this.error.set('');
    const respuestas = Object.entries(this.respuestas()).map(([preguntaId, opcionId]) => ({
      preguntaId: Number(preguntaId),
      opcionId,
    }));
    this.cuestionarioService.enviarIntento(this.cuestionarioId, respuestas).subscribe({
      next: (intento) => {
        this.enviando.set(false);
        this.confirmEnviarAbierto.set(false);
        this.miIntento.set(intento);
        this.respondido.emit(intento);
      },
      error: (err: HttpErrorResponse) => {
        this.enviando.set(false);
        this.confirmEnviarAbierto.set(false);
        this.error.set(extraerMensajeError(err));
      },
    });
  }
}

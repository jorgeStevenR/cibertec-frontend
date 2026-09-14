import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
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
export class CuestionarioResponderComponent implements OnInit {
  @Input({ required: true }) cuestionarioId!: number;
  @Input() titulo = 'Cuestionario';
  @Output() cerrado = new EventEmitter<void>();

  private readonly cuestionarioService = inject(CuestionarioService);

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

  // Todavía no llegó la fecha de apertura: el backend no manda preguntas.
  noAbierto(): boolean {
    const c = this.cuestionario();
    return !!c && !c.disponible && c.preguntas.length === 0;
  }

  // Ya pasó la fecha de entrega: el backend sí manda las preguntas para
  // revisar, pero no se puede responder.
  vencido(): boolean {
    const c = this.cuestionario();
    return !!c && !c.disponible && c.preguntas.length > 0;
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
      },
      error: (err: HttpErrorResponse) => {
        this.enviando.set(false);
        this.confirmEnviarAbierto.set(false);
        this.error.set(extraerMensajeError(err));
      },
    });
  }
}

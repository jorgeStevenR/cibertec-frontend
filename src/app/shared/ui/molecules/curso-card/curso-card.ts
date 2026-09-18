import { CommonModule } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { formatearRangoFechas } from '../../../../core/utils/curso.util';
import { CupoEstado } from '../cupo-estado/cupo-estado';

@Component({
  selector: 'curso-card',
  standalone: true,
  imports: [CommonModule, RouterLink, CupoEstado],
  templateUrl: './curso-card.html',
  styleUrl: './curso-card.scss',
})
export class CursoCard {
  readonly codigo = input('');
  readonly titulo = input.required<string>();
  readonly publicado = input(false);
  readonly docenteNombre = input<string | null>(null);
  readonly docenteEmail = input<string | null>(null);
  readonly periodo = input<string | null>(null);
  // Fechas de calendario "yyyy-MM-dd".
  readonly fechaInicio = input<string | null>(null);
  readonly fechaFin = input<string | null>(null);
  // Con `matriculados` informado se muestra "matriculados / cupo" (cupo null = sin límite).
  readonly matriculados = input<number | null>(null);
  readonly cupoMaximo = input<number | null>(null);
  readonly meta = input<string[]>([]);
  readonly routerLinkTarget = input.required<unknown[]>();
  readonly actionLabel = input('Ver curso');
  readonly mostrarParticipantes = input(true);
  readonly pendientes = input<number | null>(null);
  readonly progreso = input<number | null>(null);
  readonly progresoDetalle = input('');
  /** Reserva el pie de progreso aunque el curso no tenga avance, para que todas las tarjetas midan lo mismo. */
  readonly reservarProgreso = input(false);

  readonly vigencia = computed(() => {
    const partes: string[] = [];
    if (this.periodo()) {
      partes.push(`Período ${this.periodo()}`);
    }
    const rango = formatearRangoFechas(this.fechaInicio(), this.fechaFin());
    if (rango !== '—') {
      partes.push(rango);
    }
    return partes.join(' · ');
  });

  readonly participantesClick = output<void>();
}

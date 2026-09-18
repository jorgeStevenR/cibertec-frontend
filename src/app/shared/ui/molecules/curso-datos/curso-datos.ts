import { CommonModule } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { formatearRangoFechas } from '../../../../core/utils/curso.util';
import { CupoEstado } from '../cupo-estado/cupo-estado';

// Datos académicos de un curso en modo solo lectura (código, período, fechas y, si se
// informan `matriculados`, el cupo). Un dato que el curso no tiene se muestra como "—".
@Component({
  selector: 'curso-datos',
  standalone: true,
  imports: [CommonModule, CupoEstado],
  templateUrl: './curso-datos.html',
  styleUrl: './curso-datos.scss',
})
export class CursoDatos {
  readonly codigo = input<string | null>(null);
  readonly periodo = input<string | null>(null);
  // Fechas de calendario "yyyy-MM-dd".
  readonly fechaInicio = input<string | null>(null);
  readonly fechaFin = input<string | null>(null);
  readonly matriculados = input<number | null>(null);
  readonly cupoMaximo = input<number | null>(null);

  readonly fechas = computed(() => formatearRangoFechas(this.fechaInicio(), this.fechaFin()));
}

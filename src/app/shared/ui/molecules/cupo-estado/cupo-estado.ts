import { CommonModule } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { estadoCupo, textoCupo } from '../../../../core/utils/curso.util';

// Muestra "matriculados / cupo" (o "N matriculados · sin límite") y marca el curso
// casi lleno (queda un lugar) o lleno. El estado se dice con texto, no solo con color.
@Component({
  selector: 'cupo-estado',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cupo-estado.html',
  styleUrl: './cupo-estado.scss',
})
export class CupoEstado {
  readonly matriculados = input.required<number>();
  readonly cupoMaximo = input<number | null>(null);

  readonly estado = computed(() => estadoCupo(this.matriculados(), this.cupoMaximo()));
  readonly texto = computed(() => textoCupo(this.matriculados(), this.cupoMaximo()));
  readonly etiquetaEstado = computed(() => {
    switch (this.estado()) {
      case 'lleno':
        return 'Curso lleno';
      case 'casi-lleno':
        return 'Queda 1 lugar';
      default:
        return '';
    }
  });
}

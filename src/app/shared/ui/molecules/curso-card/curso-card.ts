import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'curso-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './curso-card.html',
  styleUrl: './curso-card.scss',
})
export class CursoCard {
  readonly codigo = input('');
  readonly titulo = input.required<string>();
  readonly publicado = input(false);
  readonly docenteNombre = input<string | null>(null);
  readonly docenteEmail = input<string | null>(null);
  readonly meta = input<string[]>([]);
  readonly routerLinkTarget = input.required<unknown[]>();
  readonly actionLabel = input('Ver curso');
  readonly mostrarParticipantes = input(true);

  readonly participantesClick = output<void>();
}

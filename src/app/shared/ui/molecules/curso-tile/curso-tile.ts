import { CommonModule } from '@angular/common';
import { Component, computed, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { colorPortada } from '../../../../core/utils/curso.util';

@Component({
  selector: 'curso-tile',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './curso-tile.html',
  styleUrl: './curso-tile.scss',
})
export class CursoTile {
  readonly titulo = input.required<string>();
  readonly subtitulo = input<string>('');
  readonly meta = input<string>('');
  readonly routerLinkTarget = input.required<unknown[]>();

  readonly participantesClick = output<void>();

  readonly menuAbierto = signal(false);

  readonly portada = computed(() => colorPortada(this.titulo()));

  alternarMenu(): void {
    this.menuAbierto.update((valor) => !valor);
  }

  cerrarMenu(): void {
    this.menuAbierto.set(false);
  }

  onParticipantes(): void {
    this.menuAbierto.set(false);
    this.participantesClick.emit();
  }
}

import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';

@Component({
  selector: 'photo-carousel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './photo-carousel.html',
  styleUrl: './photo-carousel.scss',
})
export class PhotoCarousel {
  readonly imagenes = input.required<string[]>();
  readonly intervaloMs = input(6000);

  readonly activo = signal(0);

  constructor() {
    const destroyRef = inject(DestroyRef);
    interval(this.intervaloMs())
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe(() => {
        const total = this.imagenes().length;
        if (total > 1) {
          this.activo.set((this.activo() + 1) % total);
        }
      });
  }

  irA(indice: number): void {
    this.activo.set(indice);
  }
}

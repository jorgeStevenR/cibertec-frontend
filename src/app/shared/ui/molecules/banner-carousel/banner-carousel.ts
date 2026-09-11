import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';

export interface BannerSlide {
  titulo: string;
  subtitulo: string;
  icono: 'graduacion' | 'libro' | 'cohete';
}

const SLIDES_POR_DEFECTO: BannerSlide[] = [
  {
    titulo: 'Bienvenido a Cibertec',
    subtitulo: 'Gestiona y revisa tus cursos desde un solo lugar.',
    icono: 'graduacion',
  },
  {
    titulo: 'Aprende a tu ritmo',
    subtitulo: 'Consulta los módulos y contenidos de cada curso cuando quieras.',
    icono: 'libro',
  },
  {
    titulo: 'Todo en un mismo sitio',
    subtitulo: 'Cursos, módulos y materiales, siempre a la mano.',
    icono: 'cohete',
  },
];

@Component({
  selector: 'banner-carousel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './banner-carousel.html',
  styleUrl: './banner-carousel.scss',
})
export class BannerCarousel {
  readonly slides = input<BannerSlide[]>(SLIDES_POR_DEFECTO);
  readonly intervaloMs = input(6000);

  readonly activo = signal(0);

  constructor() {
    const destroyRef = inject(DestroyRef);
    interval(this.intervaloMs())
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe(() => {
        const total = this.slides().length;
        if (total > 0) {
          this.activo.set((this.activo() + 1) % total);
        }
      });
  }

  irA(indice: number): void {
    this.activo.set(indice);
  }
}

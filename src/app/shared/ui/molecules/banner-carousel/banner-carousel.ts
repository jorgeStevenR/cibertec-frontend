import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';

export interface BannerSlideParte {
  texto?: string;
  resaltado?: boolean;
  salto?: boolean;
}

export interface BannerSlide {
  titulo: BannerSlideParte[];
  subtitulo: string;
  // Slides "clásicos": ícono dibujado + fondo degradado. Los slides con foto no llevan ícono.
  icono?: 'graduacion' | 'libro' | 'cohete';
  imagen?: string;
  alt?: string;
}

const SLIDES_POR_DEFECTO: BannerSlide[] = [
  {
    imagen: 'https://images.unsplash.com/photo-1683624328172-88fb24625ec1?w=1600&q=80&auto=format&fit=crop',
    alt: 'Persona cocinando en una cocina profesional',
    titulo: [
      { texto: 'Cocina, crea y ' },
      { texto: 'sorprende', resaltado: true },
      { texto: ' en cada ' },
      { texto: 'plato', resaltado: true },
      { texto: '.' },
    ],
    subtitulo: 'Cursos de gastronomía con chefs que te enseñan paso a paso.',
  },
  {
    imagen: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1600&q=80&auto=format&fit=crop',
    alt: 'Persona programando frente a una laptop',
    titulo: [
      { texto: 'Programa, innova y ' },
      { texto: 'construye', resaltado: true },
      { texto: ' el ' },
      { texto: 'futuro', resaltado: true },
      { texto: '.' },
    ],
    subtitulo: 'Aprende tecnología con proyectos reales desde el primer día.',
  },
  {
    imagen: 'https://images.unsplash.com/photo-1460518451285-97b6aa326961?w=1600&q=80&auto=format&fit=crop',
    alt: 'Persona leyendo un libro',
    titulo: [
      { texto: 'Lee, descubre y ' },
      { texto: 'despierta', resaltado: true },
      { texto: ' tu ' },
      { texto: 'imaginación', resaltado: true },
      { texto: '.' },
    ],
    subtitulo: 'Explora la biblioteca de Cibertec y encuentra tu próxima historia.',
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

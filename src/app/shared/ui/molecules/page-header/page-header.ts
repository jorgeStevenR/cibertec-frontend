import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'page-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './page-header.html',
  styleUrl: './page-header.scss',
})
export class PageHeader {
  readonly titulo = input.required<string>();
  readonly subtitulo = input('');
  // Si se indica, muestra un enlace "volver" sobre el título.
  readonly volverA = input<string | unknown[] | null>(null);
  readonly volverEtiqueta = input('Volver');
}

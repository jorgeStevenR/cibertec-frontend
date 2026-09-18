import { Component, input } from '@angular/core';

@Component({
  selector: 'panel-seccion',
  standalone: true,
  templateUrl: './panel-seccion.html',
  styleUrl: './panel-seccion.scss',
})
export class PanelSeccion {
  readonly titulo = input.required<string>();
  // Para contenido que ya trae su propio borde/relleno (tablas, listas).
  readonly sinRelleno = input(false);
}

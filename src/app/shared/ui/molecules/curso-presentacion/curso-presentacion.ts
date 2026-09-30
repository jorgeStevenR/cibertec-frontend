import { CommonModule } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { Curso } from '../../../../core/models/curso.model';
import { CursoDatos } from '../curso-datos/curso-datos';

/**
 * Presentación fija al inicio de un curso (igual para todos): de qué trata,
 * a qué programa pertenece, sus datos académicos y quién lo dicta.
 */
@Component({
  selector: 'app-curso-presentacion',
  standalone: true,
  imports: [CommonModule, CursoDatos],
  templateUrl: './curso-presentacion.html',
  styleUrl: './curso-presentacion.scss',
})
export class CursoPresentacion {
  readonly curso = input.required<Curso>();

  readonly iniciales = computed(() =>
    (this.curso().profesorNombre ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((parte) => parte.charAt(0).toUpperCase())
      .join(''),
  );
}

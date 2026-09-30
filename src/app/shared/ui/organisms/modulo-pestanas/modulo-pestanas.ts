import { CommonModule } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';

export interface PestanaModulo {
  id: number;
  titulo: string;
}

export interface RamaPestanas extends PestanaModulo {
  // Si el módulo raíz tiene contenido propio además de submódulos, se muestra
  // como la primera sub-pestaña ("Inicio").
  tieneContenidoPropio: boolean;
  hijos: PestanaModulo[];
}

/**
 * Pestañas de módulos como en Moodle: los módulos raíz arriba y, si el
 * elegido tiene submódulos, una segunda fila con ellos. Solo emite qué
 * módulo mostrar; el contenido lo pinta la página.
 */
@Component({
  selector: 'app-modulo-pestanas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modulo-pestanas.html',
  styleUrl: './modulo-pestanas.scss',
})
export class ModuloPestanas {
  readonly ramas = input.required<RamaPestanas[]>();
  // Módulo que se está mostrando (raíz o submódulo).
  readonly seleccionadoId = input<number | null>(null);
  readonly seleccionar = output<number>();

  readonly raizActiva = computed(() => {
    const id = this.seleccionadoId();
    return this.ramas().find((r) => r.id === id || r.hijos.some((h) => h.id === id)) ?? null;
  });

  // Segunda fila: "Inicio" (contenido propio del raíz, si tiene) + submódulos.
  readonly subPestanas = computed<PestanaModulo[]>(() => {
    const raiz = this.raizActiva();
    if (!raiz || raiz.hijos.length === 0) {
      return [];
    }
    return raiz.tieneContenidoPropio ? [{ id: raiz.id, titulo: 'Inicio' }, ...raiz.hijos] : raiz.hijos;
  });

  elegirRaiz(rama: RamaPestanas): void {
    // Un raíz sin contenido propio no tiene nada que mostrar: se abre su primer submódulo.
    const destino = !rama.tieneContenidoPropio && rama.hijos.length > 0 ? rama.hijos[0].id : rama.id;
    this.seleccionar.emit(destino);
  }
}

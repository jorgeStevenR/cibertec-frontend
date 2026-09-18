import { CommonModule } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { SegmentoDona, arcosDona } from '../../../../core/utils/graficos.util';

const LADO = 180;
const CENTRO = LADO / 2;

@Component({
  selector: 'grafico-dona',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './grafico-dona.html',
  styleUrl: './grafico-dona.scss',
})
export class GraficoDona {
  readonly segmentos = input.required<SegmentoDona[]>();
  // Texto pequeño bajo el total del centro (ej. "usuarios").
  readonly centroEtiqueta = input('');
  readonly descripcion = input('Distribución');

  readonly lado = LADO;
  readonly centro = CENTRO;

  readonly total = computed(() => this.segmentos().reduce((suma, s) => suma + Math.max(0, s.valor), 0));
  readonly arcos = computed(() => arcosDona(this.segmentos(), CENTRO, CENTRO, 84, 54));
  readonly resumen = computed(
    () => `${this.descripcion()}: ${this.arcos().map((a) => `${a.etiqueta} ${a.valor} (${a.porcentaje}%)`).join(', ')}`,
  );
}

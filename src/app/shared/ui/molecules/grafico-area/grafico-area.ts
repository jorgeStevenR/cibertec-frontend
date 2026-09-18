import { CommonModule } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import {
  Margen,
  PuntoGrafico,
  escalarPuntos,
  rutaArea,
  rutaLinea,
  techoEscala,
} from '../../../../core/utils/graficos.util';

const ANCHO = 520;
const ALTO = 230;
const MARGEN: Margen = { izq: 34, der: 16, arr: 24, aba: 28 };

@Component({
  selector: 'grafico-area',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './grafico-area.html',
  styleUrl: './grafico-area.scss',
})
export class GraficoArea {
  readonly puntos = input.required<PuntoGrafico[]>();
  // Texto para lectores de pantalla, antes de la lista de valores.
  readonly descripcion = input('Gráfico de área');

  readonly ancho = ANCHO;
  readonly alto = ALTO;
  readonly margen = MARGEN;
  readonly yBase = ALTO - MARGEN.aba;

  private readonly valores = computed(() => this.puntos().map((p) => p.valor));
  readonly escalados = computed(() => escalarPuntos(this.valores(), ANCHO, ALTO, MARGEN));
  readonly linea = computed(() => rutaLinea(this.escalados()));
  readonly area = computed(() => rutaArea(this.escalados(), this.yBase));
  readonly techo = computed(() => techoEscala(Math.max(0, ...this.valores())));

  // Líneas de la rejilla al 0 %, 25 %, 50 %, 75 % y 100 % de la altura útil.
  readonly rejilla = computed(() => {
    const util = ALTO - MARGEN.arr - MARGEN.aba;
    return [0, 0.25, 0.5, 0.75, 1].map((f) => MARGEN.arr + util - f * util);
  });

  readonly resumen = computed(
    () => `${this.descripcion()}: ${this.puntos().map((p) => `${p.etiqueta} ${p.valor}`).join(', ')}`,
  );
}

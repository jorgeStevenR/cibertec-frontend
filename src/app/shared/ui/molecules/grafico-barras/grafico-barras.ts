import { CommonModule } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { ItemBarra, escalarBarras } from '../../../../core/utils/graficos.util';

@Component({
  selector: 'grafico-barras',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './grafico-barras.html',
  styleUrl: './grafico-barras.scss',
})
export class GraficoBarras {
  readonly items = input.required<ItemBarra[]>();
  readonly descripcion = input('Comparación');
  // Con `extra` en los ítems, las barras se apilan y estos nombres arman la leyenda.
  readonly nombreValor = input('');
  readonly nombreExtra = input('');

  readonly barras = computed(() => escalarBarras(this.items()));
}

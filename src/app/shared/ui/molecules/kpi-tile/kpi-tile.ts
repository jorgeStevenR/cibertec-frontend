import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';

@Component({
  selector: 'kpi-tile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './kpi-tile.html',
  styleUrl: './kpi-tile.scss',
})
export class KpiTile {
  readonly etiqueta = input.required<string>();
  readonly valor = input.required<string | number>();
  readonly apoyo = input('');
}

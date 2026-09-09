import { CommonModule } from '@angular/common';
import { Component, ContentChild, TemplateRef, input } from '@angular/core';

export interface DataTableColumn<T = unknown> {
  key: string;
  label: string;
  format?: (row: T) => string;
  badge?: (row: T) => boolean;
  badgeLabels?: [string, string];
}

@Component({
  selector: 'data-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './data-table.html',
  styleUrl: './data-table.scss',
})
export class DataTable<T = unknown> {
  readonly columns = input<DataTableColumn<T>[]>([]);
  readonly rows = input<T[]>([]);
  readonly loading = input(false);
  readonly emptyMessage = input('No hay datos para mostrar.');

  @ContentChild('actions') actionsTpl?: TemplateRef<{ $implicit: T }>;

  cellValue(row: T, col: DataTableColumn<T>): string {
    if (col.format) {
      return col.format(row);
    }
    return String((row as Record<string, unknown>)[col.key] ?? '');
  }
}

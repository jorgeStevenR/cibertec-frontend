import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';

@Component({
  selector: 'ui-pagination',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pagination.html',
  styleUrl: './pagination.scss',
})
export class Pagination {
  readonly pagina = input(0);
  readonly totalPaginas = input(1);
  readonly totalElementos = input(0);
  readonly cambiarPagina = output<number>();

  anterior(): void {
    if (this.pagina() > 0) {
      this.cambiarPagina.emit(this.pagina() - 1);
    }
  }

  siguiente(): void {
    if (this.pagina() < this.totalPaginas() - 1) {
      this.cambiarPagina.emit(this.pagina() + 1);
    }
  }
}

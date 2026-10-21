import { CommonModule, DOCUMENT } from '@angular/common';
import { Component, ElementRef, HostListener, effect, inject, input, output } from '@angular/core';

// Lo primero que puede recibir el foco dentro del cuerpo del modal (en un
// diálogo de confirmación es "Cancelar": la opción segura).
const ENFOCABLES =
  'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

let siguienteId = 0;

@Component({
  selector: 'ui-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ui-modal.html',
  styleUrl: './ui-modal.scss',
})
export class UiModal {
  readonly open = input(false);
  readonly title = input('');
  readonly closed = output<void>();

  private readonly documento = inject(DOCUMENT);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  // Elemento que tenía el foco al abrir, para devolvérselo al cerrar.
  private focoPrevio: HTMLElement | null = null;

  readonly tituloId = `ui-modal-titulo-${++siguienteId}`;

  constructor() {
    effect(() => {
      if (this.open()) {
        this.focoPrevio = this.documento.activeElement as HTMLElement | null;
        // El panel se dibuja con *ngIf: hay que esperar a que exista.
        setTimeout(() => this.enfocarPrimero());
      } else if (this.focoPrevio) {
        const previo = this.focoPrevio;
        this.focoPrevio = null;
        setTimeout(() => {
          if (previo.isConnected) {
            previo.focus();
          }
        });
      }
    });
  }

  @HostListener('document:keydown.escape')
  cerrarConEscape(): void {
    if (this.open()) {
      this.closed.emit();
    }
  }

  onBackdropClick(): void {
    this.closed.emit();
  }

  private enfocarPrimero(): void {
    const panel = this.host.nativeElement.querySelector<HTMLElement>('.panel');
    const primero =
      panel?.querySelector<HTMLElement>(`.panel-body ${ENFOCABLES.split(', ').join(', .panel-body ')}`) ??
      panel?.querySelector<HTMLElement>('.close-btn') ??
      panel;
    primero?.focus();
  }
}

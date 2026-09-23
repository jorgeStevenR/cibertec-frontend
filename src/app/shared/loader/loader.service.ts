import { Injectable, computed, signal } from '@angular/core';

/**
 * Servicio global para mostrar/ocultar el loader.
 * Usa un contador para que, si hay varias peticiones a la vez,
 * el loader no se oculte hasta que terminen todas.
 */
@Injectable({ providedIn: 'root' })
export class LoaderService {
  private pending = signal(0);

  readonly isLoading = computed(() => this.pending() > 0);

  show(): void {
    this.pending.update((n) => n + 1);
  }

  hide(): void {
    this.pending.update((n) => Math.max(0, n - 1));
  }

  reset(): void {
    this.pending.set(0);
  }
}

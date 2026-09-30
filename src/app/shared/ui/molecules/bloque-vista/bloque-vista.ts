import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, input, signal } from '@angular/core';
import { BloqueService } from '../../../../core/services/bloque.service';
import { Bloque } from '../../../../core/models/bloque.model';
import { EmbedVideoUrlPipe } from '../../../pipes/embed-video-url.pipe';
import { extraerMensajeError } from '../../../../core/utils/http-error.util';

/** Muestra un bloque (texto, imagen, video o archivo) en modo lectura. */
@Component({
  selector: 'app-bloque-vista',
  standalone: true,
  imports: [CommonModule, EmbedVideoUrlPipe],
  templateUrl: './bloque-vista.html',
  styleUrl: './bloque-vista.scss',
})
export class BloqueVista implements OnInit {
  readonly bloque = input.required<Bloque>();

  private readonly bloqueService = inject(BloqueService);

  // La URL firmada expira a los 15 minutos: se pide al mostrar, no se guarda.
  readonly imagenUrl = signal<string | null>(null);
  readonly imagenError = signal(false);
  readonly error = signal('');

  ngOnInit(): void {
    if (this.bloque().tipo === 'IMAGEN') {
      this.bloqueService.obtenerUrl(this.bloque().id).subscribe({
        next: ({ url }) => this.imagenUrl.set(url),
        error: (err: HttpErrorResponse) => {
          console.error(`No se pudo cargar la imagen del bloque ${this.bloque().id}`, err);
          this.imagenError.set(true);
        },
      });
    }
  }

  abrirArchivo(): void {
    this.error.set('');
    this.bloqueService.obtenerUrl(this.bloque().id).subscribe({
      next: ({ url }) => window.open(url, '_blank', 'noopener'),
      error: (err: HttpErrorResponse) => this.error.set(extraerMensajeError(err)),
    });
  }
}

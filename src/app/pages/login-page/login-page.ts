import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { LoginForm } from '../../shared/ui/organisms/login-form/login-form';
import { PhotoCarousel } from '../../shared/ui/molecules/photo-carousel/photo-carousel';
import { AuthService } from '../../core/services/auth.service';
import { LoginRequest } from '../../core/models/usuario.model';

// TODO: reemplazar por fotos reales de Cibertec (campus, aulas, estudiantes) cuando estén disponibles.
const IMAGENES_CAROUSEL: string[] = [
  'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1600&q=70',
  'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&w=1600&q=70',
  'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1600&q=70',
  'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1600&q=70',
];

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, LoginForm, PhotoCarousel],
  templateUrl: './login-page.html',
  styleUrl: './login-page.scss',
})
export class LoginPage {
  readonly imagenesCarousel = IMAGENES_CAROUSEL;

  readonly loading = signal(false);
  readonly success = signal(false);
  readonly serverError = signal('');

  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
  ) {}

  onSubmit(credenciales: LoginRequest): void {
    this.serverError.set('');
    this.loading.set(true);

    this.auth.login(credenciales).subscribe({
      next: (respuesta) => {
        this.loading.set(false);
        this.success.set(true);

        const destinos: Record<string, string> = {
          ADMINISTRADOR: '/admin',
          PROFESOR: '/profesor',
          ESTUDIANTE: '/estudiante',
        };
        const destino = destinos[respuesta.usuario.rol] ?? '/login';
        setTimeout(() => this.router.navigateByUrl(destino), 500);
      },
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
        this.serverError.set(error.error?.message ?? 'No se pudo iniciar sesión. Intenta de nuevo.');
      },
    });
  }
}

import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { LoginForm } from '../../shared/ui/organisms/login-form/login-form';
import { AuthService } from '../../core/services/auth.service';
import { LoginRequest } from '../../core/models/usuario.model';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, LoginForm],
  templateUrl: './login-page.html',
  styleUrl: './login-page.scss',
})
export class LoginPage {
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

        const destino = respuesta.usuario.rol === 'ADMINISTRADOR' ? '/admin' : '/proximamente';
        setTimeout(() => this.router.navigateByUrl(destino), 500);
      },
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
        this.serverError.set(error.error?.message ?? 'No se pudo iniciar sesión. Intenta de nuevo.');
      },
    });
  }
}

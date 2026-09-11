import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { AppFooter } from '../../../shared/ui/molecules/app-footer/app-footer';

@Component({
  selector: 'app-estudiante-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet, AppFooter],
  templateUrl: './estudiante-layout.html',
  styleUrl: './estudiante-layout.scss',
})
export class EstudianteLayout {
  readonly menuAbierto = signal(false);

  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
  ) {}

  get usuario() {
    return this.auth.usuarioActual();
  }

  get iniciales(): string {
    const u = this.usuario;
    if (!u) return '';
    return `${u.nombre.charAt(0)}${u.apellido.charAt(0)}`.toUpperCase();
  }

  cerrarSesion(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}

import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, ViewChild, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { CORREO_SOPORTE } from '../../../core/config/contacto.config';
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
  readonly correoSoporte = CORREO_SOPORTE;

  @ViewChild('disparador') private disparador?: ElementRef<HTMLButtonElement>;

  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
  ) {}

  get usuario() {
    return this.auth.usuarioActual();
  }

  // "Mis cursos" es el inicio y también contiene el detalle de cada curso, así que no se
  // puede usar routerLinkActive (coincidiría por prefijo con /estudiante/calificaciones).
  get enCalificaciones(): boolean {
    return this.router.url.startsWith('/estudiante/calificaciones');
  }

  get iniciales(): string {
    const u = this.usuario;
    if (!u) return '';
    return `${u.nombre.charAt(0)}${u.apellido.charAt(0)}`.toUpperCase();
  }

  cerrarMenu(): void {
    this.menuAbierto.set(false);
  }

  @HostListener('document:keydown.escape')
  cerrarConEscape(): void {
    if (!this.menuAbierto()) {
      return;
    }
    this.menuAbierto.set(false);
    this.disparador?.nativeElement.focus();
  }

  cerrarSesion(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}

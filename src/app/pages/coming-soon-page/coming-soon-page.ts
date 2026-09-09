import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { UiButton } from '../../shared/ui/atoms/ui-button/ui-button';
import { AuthService } from '../../core/services/auth.service';

const ROL_LABELS: Record<string, string> = {
  PROFESOR: 'docentes',
  ESTUDIANTE: 'estudiantes',
};

@Component({
  selector: 'app-coming-soon-page',
  standalone: true,
  imports: [CommonModule, UiButton],
  templateUrl: './coming-soon-page.html',
  styleUrl: './coming-soon-page.scss',
})
export class ComingSoonPage {
  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
  ) {}

  get usuario() {
    return this.auth.usuarioActual();
  }

  get rolLabel(): string {
    const rol = this.usuario?.rol ?? '';
    return ROL_LABELS[rol] ?? 'tu rol';
  }

  cerrarSesion(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}

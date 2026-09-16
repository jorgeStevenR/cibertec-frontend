import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { Usuario } from '../../core/models/usuario.model';

@Component({
  selector: 'app-gestor-usuarios-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './gestor-usuarios-layout.html',
  styleUrl: './gestor-usuarios-layout.scss',
})
export class GestorUsuariosLayout {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  get usuario() {
    return this.auth.usuarioActual();
  }

  iniciales(usuario: Usuario): string {
    return `${usuario.nombre.charAt(0)}${usuario.apellido.charAt(0)}`.toUpperCase();
  }

  cerrarSesion(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}

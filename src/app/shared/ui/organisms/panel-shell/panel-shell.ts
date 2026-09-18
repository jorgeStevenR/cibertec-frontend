import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, ViewChild, inject, input, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { Usuario } from '../../../../core/models/usuario.model';

export type IconoMenu = 'inicio' | 'usuarios' | 'programas' | 'cursos';

export interface ItemMenu {
  etiqueta: string;
  ruta: string;
  icono: IconoMenu;
  // Solo se marca activo cuando la URL coincide exactamente (ej. Inicio).
  exacto?: boolean;
}

@Component({
  selector: 'panel-shell',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './panel-shell.html',
  styleUrl: './panel-shell.scss',
})
export class PanelShell {
  readonly items = input.required<ItemMenu[]>();
  readonly tituloRol = input.required<string>();

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly menuAbierto = signal(false);

  @ViewChild('botonMenu') private botonMenu?: ElementRef<HTMLButtonElement>;

  get usuario() {
    return this.auth.usuarioActual();
  }

  iniciales(usuario: Usuario): string {
    return `${usuario.nombre.charAt(0)}${usuario.apellido.charAt(0)}`.toUpperCase();
  }

  alternarMenu(): void {
    this.menuAbierto.set(!this.menuAbierto());
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
    this.botonMenu?.nativeElement.focus();
  }

  cerrarSesion(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}

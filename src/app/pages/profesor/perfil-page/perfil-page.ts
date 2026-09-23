import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UiAlert } from '../../../shared/ui/atoms/ui-alert/ui-alert';
import { CursoService } from '../../../core/services/curso.service';
import { AuthService } from '../../../core/services/auth.service';
import { Curso } from '../../../core/models/curso.model';
import { ROL_LABELS, formatearFecha } from '../../../core/utils/labels.util';
import { extraerMensajeError } from '../../../core/utils/http-error.util';

@Component({
  selector: 'app-profesor-perfil-page',
  standalone: true,
  imports: [CommonModule, RouterLink, UiAlert],
  templateUrl: './perfil-page.html',
  styleUrl: './perfil-page.scss',
})
export class ProfesorPerfilPage implements OnInit {
  private readonly cursoService = inject(CursoService);
  private readonly auth = inject(AuthService);

  readonly rolLabels = ROL_LABELS;
  readonly formatearFecha = formatearFecha;

  readonly cursos = signal<Curso[]>([]);
  readonly cargando = signal(false);
  readonly error = signal('');

  get usuario() {
    return this.auth.usuarioActual();
  }

  get iniciales(): string {
    const u = this.usuario;
    if (!u) {
      return '';
    }
    return `${u.nombre.charAt(0)}${u.apellido.charAt(0)}`.toUpperCase();
  }

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    const usuario = this.usuario;
    if (!usuario) {
      return;
    }

    this.cargando.set(true);
    this.error.set('');
    this.cursoService.listar({ profesorId: usuario.id, tamano: 100 }).subscribe({
      next: (respuesta) => {
        this.cursos.set(respuesta.contenido);
        this.cargando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.cargando.set(false);
        this.error.set(extraerMensajeError(err));
      },
    });
  }
}

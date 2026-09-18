import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { FormField } from '../../../shared/ui/molecules/form-field/form-field';
import { UiModal } from '../../../shared/ui/molecules/ui-modal/ui-modal';
import { UiButton } from '../../../shared/ui/atoms/ui-button/ui-button';
import { UiAlert } from '../../../shared/ui/atoms/ui-alert/ui-alert';
import { ConfirmDialog } from '../../../shared/ui/organisms/confirm-dialog/confirm-dialog';
import { UsuarioService } from '../../../core/services/usuario.service';
import { AuthService } from '../../../core/services/auth.service';
import { CursoService } from '../../../core/services/curso.service';
import { ProgramaService } from '../../../core/services/programa.service';
import { MatriculaService } from '../../../core/services/matricula.service';
import { MatriculaProgramaService } from '../../../core/services/matricula-programa.service';
import { Usuario } from '../../../core/models/usuario.model';
import { extraerMensajeError } from '../../../core/utils/http-error.util';
import { ROL_LABELS, formatearFecha } from '../../../core/utils/labels.util';

interface ItemPertenencia {
  id: number;
  nombre: string;
  meta?: string;
}

// Los listados de cursos/programas no están paginados de forma relevante acá —
// se piden "todos" para poder resolver el nombre a partir del cursoId/programaId
// que devuelve la matrícula (que no trae el nombre incluido).
const TAMANO_LOOKUP = 500;

@Component({
  selector: 'app-usuario-detalle-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    FormField,
    UiModal,
    UiButton,
    UiAlert,
    ConfirmDialog,
  ],
  templateUrl: './usuario-detalle-page.html',
  styleUrl: './usuario-detalle-page.scss',
})
export class UsuarioDetallePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly usuarioService = inject(UsuarioService);
  private readonly auth = inject(AuthService);
  private readonly cursoService = inject(CursoService);
  private readonly programaService = inject(ProgramaService);
  private readonly matriculaService = inject(MatriculaService);
  private readonly matriculaProgramaService = inject(MatriculaProgramaService);
  private readonly fb = inject(FormBuilder);

  readonly usuarioId = Number(this.route.snapshot.paramMap.get('usuarioId'));

  readonly usuario = signal<Usuario | null>(null);
  readonly cargando = signal(false);
  readonly error = signal('');

  // Solo GESTOR_USUARIOS puede editar/eliminar/resetear cuentas, y ni siquiera
  // ese rol puede hacerlo sobre otro ADMINISTRADOR o GESTOR_USUARIOS (el
  // backend responde 403) — así que ambas condiciones se combinan acá para
  // decidir si esta pantalla se muestra en modo edición o solo lectura.
  readonly puedeGestionar = computed(() => this.auth.usuarioActual()?.rol === 'GESTOR_USUARIOS');
  readonly puedeEditarEsteUsuario = computed(() => {
    const objetivo = this.usuario();
    return this.puedeGestionar() && objetivo != null && objetivo.rol !== 'ADMINISTRADOR' && objetivo.rol !== 'GESTOR_USUARIOS';
  });
  readonly volverUrl = computed(() => (this.puedeGestionar() ? '/gestor-usuarios/usuarios' : '/admin/usuarios'));

  readonly guardando = signal(false);
  readonly guardado = signal(false);

  readonly passwordModalAbierto = signal(false);
  readonly passwordTemporal = signal('');
  readonly copiado = signal(false);
  readonly reseteando = signal(false);

  readonly confirmEliminarAbierto = signal(false);
  readonly eliminando = signal(false);

  readonly cursosPertenece = signal<ItemPertenencia[]>([]);
  readonly programasPertenece = signal<ItemPertenencia[]>([]);
  readonly cargandoPertenencia = signal(false);
  readonly pertenenciaError = signal(false);

  readonly formatearFecha = formatearFecha;

  readonly form = this.fb.group({
    email: [{ value: '', disabled: true }],
    fechaCreacion: [{ value: '', disabled: true }],
    rol: [{ value: '', disabled: true }],
    nombre: ['', [Validators.required]],
    apellido: ['', [Validators.required]],
    activo: [true],
  });

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    this.usuarioService.obtener(this.usuarioId).subscribe({
      next: (usuario) => {
        this.usuario.set(usuario);
        this.form.reset({
          email: usuario.email,
          fechaCreacion: formatearFecha(usuario.fechaCreacion),
          rol: ROL_LABELS[usuario.rol],
          nombre: usuario.nombre,
          apellido: usuario.apellido,
          activo: usuario.activo,
        });

        if (this.puedeEditarEsteUsuario()) {
          this.form.controls.nombre.enable();
          this.form.controls.apellido.enable();
          this.form.controls.activo.enable();
        } else {
          this.form.controls.nombre.disable();
          this.form.controls.apellido.disable();
          this.form.controls.activo.disable();
        }

        this.cargando.set(false);
        this.cargarPertenencia(usuario);
      },
      error: (err: HttpErrorResponse) => {
        this.cargando.set(false);
        this.error.set(extraerMensajeError(err));
      },
    });
  }

  // No crítico para el resto de la pantalla: si falla, se muestra un aviso acá
  // mismo (pertenenciaError) en vez de tumbar la carga del usuario.
  private cargarPertenencia(usuario: Usuario): void {
    this.cursosPertenece.set([]);
    this.programasPertenece.set([]);
    this.pertenenciaError.set(false);

    if (usuario.rol === 'ADMINISTRADOR' || usuario.rol === 'GESTOR_USUARIOS') {
      return;
    }

    this.cargandoPertenencia.set(true);

    if (usuario.rol === 'PROFESOR') {
      this.cursoService
        .listar({ profesorId: usuario.id, tamano: TAMANO_LOOKUP })
        .pipe(
          catchError((err: HttpErrorResponse) => {
            console.error(`Fallo al cargar los cursos del profesor ${usuario.id}`, err);
            this.pertenenciaError.set(true);
            return of(null);
          }),
        )
        .subscribe((cursos) => {
          this.cargandoPertenencia.set(false);
          if (!cursos) {
            return;
          }
          this.cursosPertenece.set(
            cursos.contenido.map((c) => ({ id: c.id, nombre: c.titulo, meta: c.programaNombre ?? undefined })),
          );
        });
      return;
    }

    forkJoin({
      matriculas: this.matriculaService.listarPorEstudiante(usuario.id),
      matriculasPrograma: this.matriculaProgramaService.listarPorEstudiante(usuario.id),
      cursos: this.cursoService.listar({ tamano: TAMANO_LOOKUP }),
      programas: this.programaService.listar({ tamano: TAMANO_LOOKUP }),
    })
      .pipe(
        catchError((err: HttpErrorResponse) => {
          console.error(`Fallo al cargar la pertenencia del estudiante ${usuario.id}`, err);
          this.pertenenciaError.set(true);
          return of(null);
        }),
      )
      .subscribe((resultado) => {
        this.cargandoPertenencia.set(false);
        if (!resultado) {
          return;
        }
        const cursosPorId = new Map(resultado.cursos.contenido.map((c) => [c.id, c.titulo]));
        const programasPorId = new Map(resultado.programas.contenido.map((p) => [p.id, p.nombre]));
        this.cursosPertenece.set(
          resultado.matriculas.map((m) => ({
            id: m.cursoId,
            nombre: cursosPorId.get(m.cursoId) ?? `Curso #${m.cursoId}`,
          })),
        );
        this.programasPertenece.set(
          resultado.matriculasPrograma.map((m) => ({
            id: m.programaId,
            nombre: programasPorId.get(m.programaId) ?? `Programa #${m.programaId}`,
          })),
        );
      });
  }

  iniciales(usuario: Usuario): string {
    return `${usuario.nombre.charAt(0)}${usuario.apellido.charAt(0)}`.toUpperCase();
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    this.error.set('');
    const valores = this.form.getRawValue();

    this.usuarioService
      .actualizar(this.usuarioId, {
        nombre: valores.nombre!,
        apellido: valores.apellido!,
        rol: this.usuario()!.rol,
        activo: valores.activo!,
      })
      .subscribe({
        next: (usuario) => {
          this.guardando.set(false);
          this.usuario.set(usuario);
          this.guardado.set(true);
          setTimeout(() => this.guardado.set(false), 1800);
        },
        error: (err: HttpErrorResponse) => {
          this.guardando.set(false);
          this.error.set(extraerMensajeError(err));
        },
      });
  }

  resetear(): void {
    this.error.set('');
    this.reseteando.set(true);
    this.usuarioService.resetearPassword(this.usuarioId).subscribe({
      next: (respuesta) => {
        this.reseteando.set(false);
        this.passwordTemporal.set(respuesta.passwordTemporal);
        this.copiado.set(false);
        this.passwordModalAbierto.set(true);
      },
      error: (err: HttpErrorResponse) => {
        this.reseteando.set(false);
        this.error.set(extraerMensajeError(err));
      },
    });
  }

  copiarPassword(): void {
    navigator.clipboard
      ?.writeText(this.passwordTemporal())
      .then(() => {
        this.copiado.set(true);
        setTimeout(() => this.copiado.set(false), 2000);
      })
      .catch(() => {});
  }

  pedirEliminar(): void {
    this.confirmEliminarAbierto.set(true);
  }

  confirmarEliminar(): void {
    this.eliminando.set(true);
    this.usuarioService.eliminar(this.usuarioId).subscribe({
      next: () => {
        this.eliminando.set(false);
        this.confirmEliminarAbierto.set(false);
        this.router.navigateByUrl(this.volverUrl());
      },
      error: (err: HttpErrorResponse) => {
        this.eliminando.set(false);
        this.confirmEliminarAbierto.set(false);
        this.error.set(extraerMensajeError(err));
      },
    });
  }
}

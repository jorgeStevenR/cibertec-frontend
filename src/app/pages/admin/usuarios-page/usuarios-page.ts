import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { FormField } from '../../../shared/ui/molecules/form-field/form-field';
import { SelectField } from '../../../shared/ui/molecules/select-field/select-field';
import { UiModal } from '../../../shared/ui/molecules/ui-modal/ui-modal';
import { Pagination } from '../../../shared/ui/molecules/pagination/pagination';
import { UiButton } from '../../../shared/ui/atoms/ui-button/ui-button';
import { UiAlert } from '../../../shared/ui/atoms/ui-alert/ui-alert';
import { UiSelectOption } from '../../../shared/ui/atoms/ui-select/ui-select';
import { DataTable, DataTableColumn } from '../../../shared/ui/organisms/data-table/data-table';
import { ConfirmDialog } from '../../../shared/ui/organisms/confirm-dialog/confirm-dialog';
import { UsuarioService } from '../../../core/services/usuario.service';
import { Usuario } from '../../../core/models/usuario.model';
import { ROL_LABELS } from '../../../core/utils/labels.util';
import { extraerMensajeError } from '../../../core/utils/http-error.util';

const TAMANO_PAGINA = 20;

@Component({
  selector: 'app-usuarios-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormField,
    SelectField,
    UiModal,
    Pagination,
    UiButton,
    UiAlert,
    DataTable,
    ConfirmDialog,
  ],
  templateUrl: './usuarios-page.html',
  styleUrl: './usuarios-page.scss',
})
export class UsuariosPage implements OnInit {
  private readonly usuarioService = inject(UsuarioService);
  private readonly fb = inject(FormBuilder);
  private readonly busquedaSubject = new Subject<string>();

  readonly usuarios = signal<Usuario[]>([]);
  readonly cargando = signal(false);
  readonly error = signal('');

  readonly busqueda = signal('');
  readonly pagina = signal(0);
  readonly totalPaginas = signal(1);
  readonly totalElementos = signal(0);

  readonly modalAbierto = signal(false);
  readonly modoEdicion = signal(false);
  readonly usuarioEditando = signal<Usuario | null>(null);
  readonly guardando = signal(false);

  readonly confirmEliminarAbierto = signal(false);
  readonly usuarioAEliminar = signal<Usuario | null>(null);
  readonly eliminando = signal(false);

  readonly passwordModalAbierto = signal(false);
  readonly passwordTemporal = signal('');
  readonly copiado = signal(false);

  readonly opcionesRol: UiSelectOption[] = [
    { value: 'ADMINISTRADOR', label: 'Administrador' },
    { value: 'PROFESOR', label: 'Profesor' },
    { value: 'ESTUDIANTE', label: 'Estudiante' },
  ];

  readonly columnas: DataTableColumn<Usuario>[] = [
    { key: 'nombre', label: 'Nombre', format: (u) => `${u.nombre} ${u.apellido}` },
    { key: 'email', label: 'Correo' },
    { key: 'rol', label: 'Rol', format: (u) => ROL_LABELS[u.rol] },
    { key: 'activo', label: 'Estado', badge: (u) => u.activo, badgeLabels: ['Activo', 'Inactivo'] },
  ];

  readonly form = this.fb.group({
    nombre: ['', [Validators.required]],
    apellido: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    rol: ['ESTUDIANTE', [Validators.required]],
    activo: [true],
  });

  constructor() {
    this.busquedaSubject
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((valor) => {
        this.busqueda.set(valor);
        this.pagina.set(0);
        this.cargar();
      });
  }

  ngOnInit(): void {
    this.cargar();
  }

  onBusquedaInput(valor: string): void {
    this.busquedaSubject.next(valor);
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    this.usuarioService
      .listar({ pagina: this.pagina(), tamano: TAMANO_PAGINA, busqueda: this.busqueda() })
      .subscribe({
        next: (respuesta) => {
          this.usuarios.set(respuesta.contenido);
          this.totalPaginas.set(respuesta.totalPaginas);
          this.totalElementos.set(respuesta.totalElementos);
          this.cargando.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.cargando.set(false);
          this.error.set(extraerMensajeError(err));
        },
      });
  }

  cambiarPagina(pagina: number): void {
    this.pagina.set(pagina);
    this.cargar();
  }

  abrirCrear(): void {
    this.modoEdicion.set(false);
    this.usuarioEditando.set(null);
    this.form.reset({ nombre: '', apellido: '', email: '', password: '', rol: 'ESTUDIANTE', activo: true });
    this.form.controls.email.setValidators([Validators.required, Validators.email]);
    this.form.controls.password.setValidators([Validators.required, Validators.minLength(8)]);
    this.form.controls.email.updateValueAndValidity();
    this.form.controls.password.updateValueAndValidity();
    this.modalAbierto.set(true);
  }

  abrirEditar(usuario: Usuario): void {
    this.modoEdicion.set(true);
    this.usuarioEditando.set(usuario);
    this.form.reset({
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      email: usuario.email,
      password: '',
      rol: usuario.rol,
      activo: usuario.activo,
    });
    this.form.controls.email.clearValidators();
    this.form.controls.password.clearValidators();
    this.form.controls.email.updateValueAndValidity();
    this.form.controls.password.updateValueAndValidity();
    this.modalAbierto.set(true);
  }

  cerrarModal(): void {
    this.modalAbierto.set(false);
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    this.error.set('');
    const valores = this.form.getRawValue();
    const editando = this.modoEdicion() ? this.usuarioEditando() : null;

    const obs = editando
      ? this.usuarioService.actualizar(editando.id, {
          nombre: valores.nombre!,
          apellido: valores.apellido!,
          rol: valores.rol! as Usuario['rol'],
          activo: valores.activo!,
        })
      : this.usuarioService.crear({
          nombre: valores.nombre!,
          apellido: valores.apellido!,
          email: valores.email!,
          password: valores.password!,
          rol: valores.rol! as Usuario['rol'],
        });

    obs.subscribe({
      next: () => {
        this.guardando.set(false);
        this.modalAbierto.set(false);
        this.cargar();
      },
      error: (err: HttpErrorResponse) => {
        this.guardando.set(false);
        this.error.set(extraerMensajeError(err));
      },
    });
  }

  resetear(usuario: Usuario): void {
    this.error.set('');
    this.usuarioService.resetearPassword(usuario.id).subscribe({
      next: (respuesta) => {
        this.passwordTemporal.set(respuesta.passwordTemporal);
        this.copiado.set(false);
        this.passwordModalAbierto.set(true);
      },
      error: (err: HttpErrorResponse) => this.error.set(extraerMensajeError(err)),
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

  pedirEliminar(usuario: Usuario): void {
    this.usuarioAEliminar.set(usuario);
    this.confirmEliminarAbierto.set(true);
  }

  confirmarEliminar(): void {
    const usuario = this.usuarioAEliminar();
    if (!usuario) {
      return;
    }

    this.eliminando.set(true);
    this.usuarioService.eliminar(usuario.id).subscribe({
      next: () => {
        this.eliminando.set(false);
        this.confirmEliminarAbierto.set(false);
        if (this.usuarios().length === 1 && this.pagina() > 0) {
          this.pagina.set(this.pagina() - 1);
        }
        this.cargar();
      },
      error: (err: HttpErrorResponse) => {
        this.eliminando.set(false);
        this.confirmEliminarAbierto.set(false);
        this.error.set(extraerMensajeError(err));
      },
    });
  }
}

import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { FormField } from '../../../shared/ui/molecules/form-field/form-field';
import { SelectField } from '../../../shared/ui/molecules/select-field/select-field';
import { UiButton } from '../../../shared/ui/atoms/ui-button/ui-button';
import { UiAlert } from '../../../shared/ui/atoms/ui-alert/ui-alert';
import { UiSelectOption } from '../../../shared/ui/atoms/ui-select/ui-select';
import { UsuarioService } from '../../../core/services/usuario.service';
import { Usuario } from '../../../core/models/usuario.model';
import { extraerMensajeError } from '../../../core/utils/http-error.util';

@Component({
  selector: 'app-usuario-crear-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, FormField, SelectField, UiButton, UiAlert],
  templateUrl: './usuario-crear-page.html',
  styleUrl: './usuario-crear-page.scss',
})
export class UsuarioCrearPage {
  private readonly usuarioService = inject(UsuarioService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly guardando = signal(false);
  readonly error = signal('');

  // GESTOR_USUARIOS solo puede crear cuentas PROFESOR o ESTUDIANTE — el backend
  // rechaza con 403 si se intenta crear un ADMINISTRADOR o GESTOR_USUARIOS acá.
  readonly opcionesRol: UiSelectOption[] = [
    { value: 'PROFESOR', label: 'Profesor' },
    { value: 'ESTUDIANTE', label: 'Estudiante' },
  ];

  readonly form = this.fb.group({
    nombre: ['', [Validators.required]],
    apellido: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    rol: ['ESTUDIANTE', [Validators.required]],
  });

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    this.error.set('');
    const valores = this.form.getRawValue();

    this.usuarioService
      .crear({
        nombre: valores.nombre!,
        apellido: valores.apellido!,
        email: valores.email!,
        password: valores.password!,
        rol: valores.rol! as Usuario['rol'],
      })
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.router.navigateByUrl('/gestor-usuarios/usuarios');
        },
        error: (err: HttpErrorResponse) => {
          this.guardando.set(false);
          this.error.set(extraerMensajeError(err));
        },
      });
  }
}

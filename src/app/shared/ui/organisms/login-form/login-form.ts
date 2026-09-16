import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormField } from '../../molecules/form-field/form-field';
import { UiButton } from '../../atoms/ui-button/ui-button';
import { UiAlert } from '../../atoms/ui-alert/ui-alert';
import { LoginRequest } from '../../../../core/models/usuario.model';

export function mensajeErrorControl(
  control: FormControl,
  mensajes: { requerido: string; invalido: string },
): string {
  return control.errors?.['required'] ? mensajes.requerido : mensajes.invalido;
}

@Component({
  selector: 'login-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormField, UiButton, UiAlert],
  templateUrl: './login-form.html',
  styleUrl: './login-form.scss',
})
export class LoginForm {
  readonly loading = input(false);
  readonly success = input(false);
  readonly serverError = input('');
  readonly submitted = output<LoginRequest>();

  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  readonly mostrarPassword = signal(false);
  readonly tipoPasswordInput = computed(() => (this.mostrarPassword() ? 'text' : 'password'));

  alternarPassword(): void {
    this.mostrarPassword.update((valor) => !valor);
  }

  mensajeErrorEmail(): string {
    return mensajeErrorControl(this.form.controls.email, {
      requerido: 'El correo es obligatorio',
      invalido: 'Ingresa un correo válido',
    });
  }

  mensajeErrorPassword(): string {
    return mensajeErrorControl(this.form.controls.password, {
      requerido: 'La contraseña es obligatoria',
      invalido: 'La contraseña debe tener al menos 6 caracteres',
    });
  }

  onSubmit(): void {
    if (this.loading()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitted.emit(this.form.getRawValue() as LoginRequest);
  }
}

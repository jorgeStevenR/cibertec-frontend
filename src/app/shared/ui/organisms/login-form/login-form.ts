import { CommonModule } from '@angular/common';
import { Component, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormField } from '../../molecules/form-field/form-field';
import { UiButton } from '../../atoms/ui-button/ui-button';
import { LoginRequest } from '../../../../core/models/usuario.model';

@Component({
  selector: 'login-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormField, UiButton],
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

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitted.emit(this.form.getRawValue() as LoginRequest);
  }
}

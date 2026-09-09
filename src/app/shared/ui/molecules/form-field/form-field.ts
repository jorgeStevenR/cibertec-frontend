import { Component, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { UiInput } from '../../atoms/ui-input/ui-input';

@Component({
  selector: 'form-field',
  standalone: true,
  imports: [UiInput, ReactiveFormsModule, CommonModule],
  templateUrl: './form-field.html',
  styleUrl: './form-field.scss',
})
export class FormField {
  readonly label = input.required<string>();
  readonly inputId = input.required<string>();
  readonly control = input.required<FormControl>();
  readonly type = input<'text' | 'email' | 'password' | 'number'>('text');
  readonly placeholder = input('');
  readonly autocomplete = input('off');
  readonly errorMessage = input('');
  readonly hideLabel = input(false);

  get invalido(): boolean {
    const c = this.control();
    return c.touched && c.invalid;
  }
}

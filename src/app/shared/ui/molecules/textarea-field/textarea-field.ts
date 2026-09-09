import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { UiTextarea } from '../../atoms/ui-textarea/ui-textarea';

@Component({
  selector: 'textarea-field',
  standalone: true,
  imports: [UiTextarea, ReactiveFormsModule, CommonModule],
  templateUrl: './textarea-field.html',
  styleUrl: './textarea-field.scss',
})
export class TextareaField {
  readonly label = input.required<string>();
  readonly inputId = input.required<string>();
  readonly control = input.required<FormControl>();
  readonly placeholder = input('');
  readonly rows = input(4);
  readonly errorMessage = input('');
  readonly hideLabel = input(false);

  get invalido(): boolean {
    const c = this.control();
    return c.touched && c.invalid;
  }
}

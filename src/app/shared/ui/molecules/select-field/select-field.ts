import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { UiSelect, UiSelectOption } from '../../atoms/ui-select/ui-select';

@Component({
  selector: 'select-field',
  standalone: true,
  imports: [UiSelect, ReactiveFormsModule, CommonModule],
  templateUrl: './select-field.html',
  styleUrl: './select-field.scss',
})
export class SelectField {
  readonly label = input.required<string>();
  readonly inputId = input.required<string>();
  readonly control = input.required<FormControl>();
  readonly options = input<UiSelectOption[]>([]);
  readonly placeholder = input('Selecciona una opción');
  readonly errorMessage = input('');
  readonly hideLabel = input(false);

  get invalido(): boolean {
    const c = this.control();
    return c.touched && c.invalid;
  }
}

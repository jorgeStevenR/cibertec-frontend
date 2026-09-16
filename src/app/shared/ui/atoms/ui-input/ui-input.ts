import { Component, forwardRef, input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'ui-input',
  standalone: true,
  templateUrl: './ui-input.html',
  styleUrl: './ui-input.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => UiInput),
      multi: true,
    },
  ],
})
export class UiInput implements ControlValueAccessor {
  readonly inputId = input('');
  readonly type = input<'text' | 'email' | 'password' | 'number'>('text');
  readonly placeholder = input('');
  readonly autocomplete = input('off');
  readonly invalid = input(false);
  readonly conBoton = input(false);

  protected value = '';
  protected disabled = false;

  private onChange: (valor: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(valor: string): void {
    this.value = valor ?? '';
  }

  registerOnChange(fn: (valor: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(estaDeshabilitado: boolean): void {
    this.disabled = estaDeshabilitado;
  }

  onInput(evento: Event): void {
    this.value = (evento.target as HTMLInputElement).value;
    this.onChange(this.value);
  }

  onBlur(): void {
    this.onTouched();
  }
}

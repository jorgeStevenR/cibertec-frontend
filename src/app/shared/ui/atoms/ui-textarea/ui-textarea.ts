import { Component, forwardRef, input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'ui-textarea',
  standalone: true,
  templateUrl: './ui-textarea.html',
  styleUrl: './ui-textarea.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => UiTextarea),
      multi: true,
    },
  ],
})
export class UiTextarea implements ControlValueAccessor {
  readonly inputId = input('');
  readonly placeholder = input('');
  readonly invalid = input(false);
  readonly rows = input(4);

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
    this.value = (evento.target as HTMLTextAreaElement).value;
    this.onChange(this.value);
  }

  onBlur(): void {
    this.onTouched();
  }
}

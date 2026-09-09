import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';

@Component({
  selector: 'ui-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ui-button.html',
  styleUrl: './ui-button.scss',
})
export class UiButton {
  readonly type = input<'button' | 'submit'>('button');
  readonly disabled = input(false);
  readonly loading = input(false);
  readonly success = input(false);
  readonly pressed = output<void>();

  onClick(): void {
    if (!this.disabled() && !this.loading()) {
      this.pressed.emit();
    }
  }
}

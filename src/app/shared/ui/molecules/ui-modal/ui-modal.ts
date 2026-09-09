import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';

@Component({
  selector: 'ui-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ui-modal.html',
  styleUrl: './ui-modal.scss',
})
export class UiModal {
  readonly open = input(false);
  readonly title = input('');
  readonly closed = output<void>();

  onBackdropClick(): void {
    this.closed.emit();
  }
}

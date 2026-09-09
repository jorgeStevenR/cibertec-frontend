import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';

@Component({
  selector: 'ui-alert',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ui-alert.html',
  styleUrl: './ui-alert.scss',
})
export class UiAlert {
  readonly message = input('');
  readonly variant = input<'danger' | 'success'>('danger');
}

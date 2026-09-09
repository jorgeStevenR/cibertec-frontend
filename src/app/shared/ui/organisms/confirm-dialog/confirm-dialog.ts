import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { UiButton } from '../../atoms/ui-button/ui-button';
import { UiModal } from '../../molecules/ui-modal/ui-modal';

@Component({
  selector: 'confirm-dialog',
  standalone: true,
  imports: [CommonModule, UiModal, UiButton],
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.scss',
})
export class ConfirmDialog {
  readonly open = input(false);
  readonly title = input('¿Estás seguro?');
  readonly message = input('');
  readonly confirmLabel = input('Confirmar');
  readonly cancelLabel = input('Cancelar');
  readonly variant = input<'primary' | 'danger'>('danger');
  readonly loading = input(false);
  readonly confirmed = output<void>();
  readonly cancelled = output<void>();
}

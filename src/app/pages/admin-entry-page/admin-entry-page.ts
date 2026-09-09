import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { UiButton } from '../../shared/ui/atoms/ui-button/ui-button';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-admin-entry-page',
  standalone: true,
  imports: [CommonModule, UiButton],
  templateUrl: './admin-entry-page.html',
  styleUrl: './admin-entry-page.scss',
})
export class AdminEntryPage {
  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
  ) {}

  get usuario() {
    return this.auth.usuarioActual();
  }

  cerrarSesion(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}

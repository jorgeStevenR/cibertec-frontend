import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { CORREO_SOPORTE, SEDES_CONTACTO } from '../../../../core/config/contacto.config';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app-footer.html',
  styleUrl: './app-footer.scss',
})
export class AppFooter {
  readonly anio = new Date().getFullYear();
  readonly sedes = SEDES_CONTACTO;
  readonly correoSoporte = CORREO_SOPORTE;
}

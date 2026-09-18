import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ItemMenu, PanelShell } from '../../../shared/ui/organisms/panel-shell/panel-shell';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, PanelShell],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.scss',
})
export class AdminLayout {
  readonly menu: ItemMenu[] = [
    { etiqueta: 'Inicio', ruta: '/admin/inicio', icono: 'inicio', exacto: true },
    { etiqueta: 'Usuarios', ruta: '/admin/usuarios', icono: 'usuarios' },
    { etiqueta: 'Programas', ruta: '/admin/programas', icono: 'programas' },
    { etiqueta: 'Cursos', ruta: '/admin/cursos', icono: 'cursos' },
  ];
}

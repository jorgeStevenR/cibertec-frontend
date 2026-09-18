import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ItemMenu, PanelShell } from '../../shared/ui/organisms/panel-shell/panel-shell';

@Component({
  selector: 'app-gestor-usuarios-layout',
  standalone: true,
  imports: [RouterOutlet, PanelShell],
  templateUrl: './gestor-usuarios-layout.html',
  styleUrl: './gestor-usuarios-layout.scss',
})
export class GestorUsuariosLayout {
  readonly menu: ItemMenu[] = [
    { etiqueta: 'Inicio', ruta: '/gestor-usuarios/inicio', icono: 'inicio', exacto: true },
    { etiqueta: 'Usuarios', ruta: '/gestor-usuarios/usuarios', icono: 'usuarios' },
  ];
}

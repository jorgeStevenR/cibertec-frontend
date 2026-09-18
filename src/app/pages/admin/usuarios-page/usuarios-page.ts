import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { Pagination } from '../../../shared/ui/molecules/pagination/pagination';
import { UiButton } from '../../../shared/ui/atoms/ui-button/ui-button';
import { UiAlert } from '../../../shared/ui/atoms/ui-alert/ui-alert';
import { DataTable, DataTableCellDirective, DataTableColumn } from '../../../shared/ui/organisms/data-table/data-table';
import { UsuarioService } from '../../../core/services/usuario.service';
import { AuthService } from '../../../core/services/auth.service';
import { Usuario } from '../../../core/models/usuario.model';
import { ROL_LABELS } from '../../../core/utils/labels.util';
import { extraerMensajeError } from '../../../core/utils/http-error.util';

const TAMANO_PAGINA = 20;

@Component({
  selector: 'app-usuarios-page',
  standalone: true,
  imports: [CommonModule, RouterLink, Pagination, UiButton, UiAlert, DataTable, DataTableCellDirective],
  templateUrl: './usuarios-page.html',
  styleUrl: './usuarios-page.scss',
})
export class UsuariosPage implements OnInit {
  private readonly usuarioService = inject(UsuarioService);
  private readonly auth = inject(AuthService);
  private readonly busquedaSubject = new Subject<string>();

  // Solo GESTOR_USUARIOS puede crear/editar cuentas; ADMINISTRADOR ve esta
  // misma pantalla en modo solo-lectura (el backend ya rechaza con 403
  // cualquier escritura de un administrador sobre /api/usuarios).
  readonly puedeGestionar = computed(() => this.auth.usuarioActual()?.rol === 'GESTOR_USUARIOS');
  readonly detalleBase = computed(() => (this.puedeGestionar() ? '/gestor-usuarios/usuarios' : '/admin/usuarios'));

  readonly usuarios = signal<Usuario[]>([]);
  readonly cargando = signal(false);
  readonly error = signal('');

  readonly busqueda = signal('');
  readonly pagina = signal(0);
  readonly totalPaginas = signal(1);
  readonly totalElementos = signal(0);

  readonly columnas: DataTableColumn<Usuario>[] = [
    { key: 'usuario', label: 'Usuario' },
    { key: 'rol', label: 'Rol', format: (u) => ROL_LABELS[u.rol] },
    { key: 'activo', label: 'Estado', badge: (u) => u.activo, badgeLabels: ['Activo', 'Inactivo'] },
  ];

  iniciales(usuario: Usuario): string {
    return `${usuario.nombre.charAt(0)}${usuario.apellido.charAt(0)}`.toUpperCase();
  }

  constructor() {
    this.busquedaSubject
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((valor) => {
        this.busqueda.set(valor);
        this.pagina.set(0);
        this.cargar();
      });
  }

  ngOnInit(): void {
    this.cargar();
  }

  onBusquedaInput(valor: string): void {
    this.busquedaSubject.next(valor);
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    this.usuarioService
      .listar({ pagina: this.pagina(), tamano: TAMANO_PAGINA, busqueda: this.busqueda() })
      .subscribe({
        next: (respuesta) => {
          this.usuarios.set(respuesta.contenido);
          this.totalPaginas.set(respuesta.totalPaginas);
          this.totalElementos.set(respuesta.totalElementos);
          this.cargando.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.cargando.set(false);
          this.error.set(extraerMensajeError(err));
        },
      });
  }

  cambiarPagina(pagina: number): void {
    this.pagina.set(pagina);
    this.cargar();
  }
}

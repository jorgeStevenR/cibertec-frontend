import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UiAlert } from '../../../shared/ui/atoms/ui-alert/ui-alert';
import { UiSelectOption } from '../../../shared/ui/atoms/ui-select/ui-select';
import { SelectField } from '../../../shared/ui/molecules/select-field/select-field';
import { Pagination } from '../../../shared/ui/molecules/pagination/pagination';
import { CursoTile } from '../../../shared/ui/molecules/curso-tile/curso-tile';
import { CursoService } from '../../../core/services/curso.service';
import { AuthService } from '../../../core/services/auth.service';
import { Curso } from '../../../core/models/curso.model';
import { extraerMensajeError } from '../../../core/utils/http-error.util';

const TAMANO_PAGINA = 12;

@Component({
  selector: 'app-profesor-catalogo-cursos-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, UiAlert, SelectField, Pagination, CursoTile],
  templateUrl: './catalogo-cursos-page.html',
  styleUrl: './catalogo-cursos-page.scss',
})
export class ProfesorCatalogoCursosPage implements OnInit {
  private readonly cursoService = inject(CursoService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  readonly cursos = signal<Curso[]>([]);
  readonly cargando = signal(false);
  readonly error = signal('');

  readonly busqueda = signal('');
  readonly pagina = signal(0);

  readonly filtroEstado = this.fb.control('TODOS');
  readonly orden = this.fb.control('NOMBRE');

  readonly opcionesEstado: UiSelectOption[] = [
    { value: 'TODOS', label: 'Todos' },
    { value: 'PUBLICADO', label: 'Publicados' },
    { value: 'BORRADOR', label: 'Borrador' },
  ];

  readonly opcionesOrden: UiSelectOption[] = [
    { value: 'NOMBRE', label: 'Ordenar por nombre del curso' },
    { value: 'RECIENTE', label: 'Más reciente primero' },
  ];

  readonly cursosFiltrados = computed(() => {
    const termino = this.busqueda().trim().toLowerCase();
    const estado = this.filtroEstado.value;

    const filtrados = this.cursos().filter((curso) => {
      const coincideTexto = !termino || curso.titulo.toLowerCase().includes(termino);
      const coincideEstado =
        estado === 'TODOS' || (estado === 'PUBLICADO' ? curso.publicado : !curso.publicado);
      return coincideTexto && coincideEstado;
    });

    return [...filtrados].sort((a, b) =>
      this.orden.value === 'RECIENTE'
        ? b.fechaCreacion.localeCompare(a.fechaCreacion)
        : a.titulo.localeCompare(b.titulo),
    );
  });

  readonly totalPaginas = computed(() => Math.max(1, Math.ceil(this.cursosFiltrados().length / TAMANO_PAGINA)));
  readonly cursosPagina = computed(() => {
    const inicio = this.pagina() * TAMANO_PAGINA;
    return this.cursosFiltrados().slice(inicio, inicio + TAMANO_PAGINA);
  });

  constructor() {
    this.filtroEstado.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.pagina.set(0));
    this.orden.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.pagina.set(0));
  }

  ngOnInit(): void {
    this.cargar();
  }

  onBusquedaInput(valor: string): void {
    this.busqueda.set(valor);
    this.pagina.set(0);
  }

  cambiarPagina(pagina: number): void {
    this.pagina.set(pagina);
  }

  cargar(): void {
    const usuario = this.auth.usuarioActual();
    if (!usuario) {
      return;
    }

    this.cargando.set(true);
    this.error.set('');
    this.cursoService.listar({ profesorId: usuario.id, tamano: 100 }).subscribe({
      next: (respuesta) => {
        this.cursos.set(respuesta.contenido);
        this.cargando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.cargando.set(false);
        this.error.set(extraerMensajeError(err));
      },
    });
  }

  abrirParticipantes(curso: Curso): void {
    this.router.navigate(['/profesor', 'cursos', curso.id], { queryParams: { tab: 'participantes' } });
  }
}

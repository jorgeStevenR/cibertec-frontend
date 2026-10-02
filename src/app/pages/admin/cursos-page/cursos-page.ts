import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { SelectField } from '../../../shared/ui/molecules/select-field/select-field';
import { PageHeader } from '../../../shared/ui/molecules/page-header/page-header';
import { CupoEstado } from '../../../shared/ui/molecules/cupo-estado/cupo-estado';
import { Pagination } from '../../../shared/ui/molecules/pagination/pagination';
import { UiButton } from '../../../shared/ui/atoms/ui-button/ui-button';
import { UiAlert } from '../../../shared/ui/atoms/ui-alert/ui-alert';
import { UiSelectOption } from '../../../shared/ui/atoms/ui-select/ui-select';
import { DataTable, DataTableColumn } from '../../../shared/ui/organisms/data-table/data-table';
import { CursoService } from '../../../core/services/curso.service';
import { UsuarioService } from '../../../core/services/usuario.service';
import { ProgramaService } from '../../../core/services/programa.service';
import { Curso } from '../../../core/models/curso.model';
import { Usuario } from '../../../core/models/usuario.model';
import { Programa } from '../../../core/models/programa.model';
import { extraerMensajeError } from '../../../core/utils/http-error.util';
import { formatearFechaCalendario } from '../../../core/utils/calendario.util';

const TAMANO_PAGINA = 20;
// Los cursos se pagina de a 20, pero los filtros de profesor/programa necesitan
// "todos"; el backend no ofrece un endpoint sin paginar, así que pedimos una
// página grande de una sola vez.
const TAMANO_LOOKUP_PROFESORES = 500;
const TAMANO_LOOKUP_PROGRAMAS = 500;

@Component({
  selector: 'app-cursos-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    SelectField,
    PageHeader,
    CupoEstado,
    Pagination,
    UiButton,
    UiAlert,
    DataTable,
  ],
  templateUrl: './cursos-page.html',
  styleUrl: './cursos-page.scss',
})
export class CursosPage implements OnInit {
  private readonly cursoService = inject(CursoService);
  private readonly usuarioService = inject(UsuarioService);
  private readonly programaService = inject(ProgramaService);
  private readonly fb = inject(FormBuilder);

  readonly cursos = signal<Curso[]>([]);
  readonly profesores = signal<Usuario[]>([]);
  readonly programas = signal<Programa[]>([]);
  readonly cargando = signal(false);
  readonly error = signal('');

  readonly pagina = signal(0);
  readonly totalPaginas = signal(1);
  readonly totalElementos = signal(0);

  readonly filtroProfesor = this.fb.control('TODOS');
  readonly filtroPrograma = this.fb.control('TODOS');

  readonly columnas: DataTableColumn<Curso>[] = [
    { key: 'titulo', label: 'Curso' },
    { key: 'profesor', label: 'Profesor', format: (c) => this.nombreProfesor(c) },
    { key: 'periodo', label: 'Período', format: (c) => c.periodo ?? '—' },
    { key: 'fechas', label: 'Fechas' },
    { key: 'cupo', label: 'Cupo' },
    {
      key: 'publicado',
      label: 'Estado',
      badge: (c) => c.publicado,
      badgeLabels: ['Publicado', 'Borrador'],
    },
  ];

  readonly formatearFechaCalendario = formatearFechaCalendario;

  constructor() {
    this.filtroProfesor.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.pagina.set(0);
      this.cargar();
    });
    this.filtroPrograma.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.pagina.set(0);
      this.cargar();
    });
  }

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    forkJoin({
      cursos: this.cursoService.listar({
        pagina: this.pagina(),
        tamano: TAMANO_PAGINA,
        profesorId: this.filtroProfesor.value !== 'TODOS' ? Number(this.filtroProfesor.value) : undefined,
        programaId: this.filtroPrograma.value !== 'TODOS' ? Number(this.filtroPrograma.value) : undefined,
      }),
      usuarios: this.usuarioService.listar({ tamano: TAMANO_LOOKUP_PROFESORES }),
      programas: this.programaService.listar({ tamano: TAMANO_LOOKUP_PROGRAMAS }),
    }).subscribe({
      next: ({ cursos, usuarios, programas }) => {
        this.cursos.set(cursos.contenido);
        this.totalPaginas.set(cursos.totalPaginas);
        this.totalElementos.set(cursos.totalElementos);
        this.profesores.set(usuarios.contenido.filter((u) => u.rol === 'PROFESOR'));
        this.programas.set(programas.contenido);
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

  nombreProfesor(curso: Curso): string {
    if (curso.profesorNombre) {
      return curso.profesorNombre;
    }
    const profesor = this.profesores().find((p) => p.id === curso.profesorId);
    return profesor ? `${profesor.nombre} ${profesor.apellido}` : `#${curso.profesorId}`;
  }

  get hayFiltros(): boolean {
    return this.filtroProfesor.value !== 'TODOS' || this.filtroPrograma.value !== 'TODOS';
  }

  get opcionesProfesorFiltro(): UiSelectOption[] {
    return [
      { value: 'TODOS', label: 'Todos los profesores' },
      ...this.profesores().map((p) => ({ value: String(p.id), label: `${p.nombre} ${p.apellido}` })),
    ];
  }

  get opcionesProgramaFiltro(): UiSelectOption[] {
    return [
      { value: 'TODOS', label: 'Todos los programas' },
      ...this.programas().map((p) => ({ value: String(p.id), label: p.nombre })),
    ];
  }
}

import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { FormField } from '../../../shared/ui/molecules/form-field/form-field';
import { SelectField } from '../../../shared/ui/molecules/select-field/select-field';
import { TextareaField } from '../../../shared/ui/molecules/textarea-field/textarea-field';
import { UiModal } from '../../../shared/ui/molecules/ui-modal/ui-modal';
import { Pagination } from '../../../shared/ui/molecules/pagination/pagination';
import { UiButton } from '../../../shared/ui/atoms/ui-button/ui-button';
import { UiAlert } from '../../../shared/ui/atoms/ui-alert/ui-alert';
import { UiSelectOption } from '../../../shared/ui/atoms/ui-select/ui-select';
import { DataTable, DataTableColumn } from '../../../shared/ui/organisms/data-table/data-table';
import { ConfirmDialog } from '../../../shared/ui/organisms/confirm-dialog/confirm-dialog';
import { CursoService } from '../../../core/services/curso.service';
import { UsuarioService } from '../../../core/services/usuario.service';
import { ProgramaService } from '../../../core/services/programa.service';
import { Curso } from '../../../core/models/curso.model';
import { Usuario } from '../../../core/models/usuario.model';
import { Programa } from '../../../core/models/programa.model';
import { extraerMensajeError } from '../../../core/utils/http-error.util';
import { formatearFecha } from '../../../core/utils/labels.util';

const TAMANO_PAGINA = 20;
// Los cursos se pagina de a 20, pero los dropdowns de profesores/programas necesitan
// "todos" para poder asignar cualquiera; el backend no ofrece un endpoint sin
// paginar, así que pedimos una página grande de una sola vez.
const TAMANO_LOOKUP_PROFESORES = 500;
const TAMANO_LOOKUP_PROGRAMAS = 500;

@Component({
  selector: 'app-cursos-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    FormField,
    SelectField,
    TextareaField,
    UiModal,
    Pagination,
    UiButton,
    UiAlert,
    DataTable,
    ConfirmDialog,
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

  readonly modalAbierto = signal(false);
  readonly modoEdicion = signal(false);
  readonly cursoEditando = signal<Curso | null>(null);
  readonly guardando = signal(false);

  readonly confirmEliminarAbierto = signal(false);
  readonly cursoAEliminar = signal<Curso | null>(null);
  readonly eliminando = signal(false);

  readonly columnas: DataTableColumn<Curso>[] = [
    { key: 'titulo', label: 'Título' },
    { key: 'profesor', label: 'Profesor', format: (c) => this.nombreProfesor(c.profesorId) },
    { key: 'programa', label: 'Programa', format: (c) => c.programaNombre ?? 'Sin programa asignado' },
    {
      key: 'publicado',
      label: 'Estado',
      badge: (c) => c.publicado,
      badgeLabels: ['Publicado', 'Borrador'],
    },
    { key: 'fechaCreacion', label: 'Creado', format: (c) => formatearFecha(c.fechaCreacion) },
  ];

  readonly form = this.fb.group({
    titulo: ['', [Validators.required]],
    descripcion: [''],
    profesorId: ['', [Validators.required]],
    programaId: ['', [Validators.required]],
    publicado: [false],
  });

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

  nombreProfesor(id: number): string {
    const profesor = this.profesores().find((p) => p.id === id);
    return profesor ? `${profesor.nombre} ${profesor.apellido}` : `#${id}`;
  }

  get opcionesProfesor(): UiSelectOption[] {
    return this.profesores().map((p) => ({ value: String(p.id), label: `${p.nombre} ${p.apellido}` }));
  }

  get opcionesPrograma(): UiSelectOption[] {
    return this.programas().map((p) => ({ value: String(p.id), label: p.nombre }));
  }

  get opcionesProfesorFiltro(): UiSelectOption[] {
    return [{ value: 'TODOS', label: 'Todos los profesores' }, ...this.opcionesProfesor];
  }

  get opcionesProgramaFiltro(): UiSelectOption[] {
    return [{ value: 'TODOS', label: 'Todos los programas' }, ...this.opcionesPrograma];
  }

  abrirCrear(): void {
    this.modoEdicion.set(false);
    this.cursoEditando.set(null);
    this.form.reset({ titulo: '', descripcion: '', profesorId: '', programaId: '', publicado: false });
    this.form.controls.profesorId.setValidators([Validators.required]);
    this.form.controls.profesorId.updateValueAndValidity();
    this.modalAbierto.set(true);
  }

  abrirEditar(curso: Curso): void {
    this.modoEdicion.set(true);
    this.cursoEditando.set(curso);
    this.form.reset({
      titulo: curso.titulo,
      descripcion: curso.descripcion,
      profesorId: String(curso.profesorId),
      programaId: curso.programaId != null ? String(curso.programaId) : '',
      publicado: curso.publicado,
    });
    this.form.controls.profesorId.clearValidators();
    this.form.controls.profesorId.updateValueAndValidity();
    this.modalAbierto.set(true);
  }

  cerrarModal(): void {
    this.modalAbierto.set(false);
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    this.error.set('');
    const valores = this.form.getRawValue();
    const editando = this.modoEdicion() ? this.cursoEditando() : null;

    const obs = editando
      ? this.cursoService.actualizar(editando.id, {
          titulo: valores.titulo!,
          descripcion: valores.descripcion ?? '',
          publicado: valores.publicado!,
          programaId: Number(valores.programaId),
        })
      : this.cursoService.crear({
          titulo: valores.titulo!,
          descripcion: valores.descripcion ?? '',
          profesorId: Number(valores.profesorId),
          programaId: Number(valores.programaId),
        });

    obs.subscribe({
      next: () => {
        this.guardando.set(false);
        this.modalAbierto.set(false);
        this.cargar();
      },
      error: (err: HttpErrorResponse) => {
        this.guardando.set(false);
        this.error.set(extraerMensajeError(err));
      },
    });
  }

  pedirEliminar(curso: Curso): void {
    this.cursoAEliminar.set(curso);
    this.confirmEliminarAbierto.set(true);
  }

  confirmarEliminar(): void {
    const curso = this.cursoAEliminar();
    if (!curso) {
      return;
    }

    this.eliminando.set(true);
    this.cursoService.eliminar(curso.id).subscribe({
      next: () => {
        this.eliminando.set(false);
        this.confirmEliminarAbierto.set(false);
        if (this.cursos().length === 1 && this.pagina() > 0) {
          this.pagina.set(this.pagina() - 1);
        }
        this.cargar();
      },
      error: (err: HttpErrorResponse) => {
        this.eliminando.set(false);
        this.confirmEliminarAbierto.set(false);
        this.error.set(extraerMensajeError(err));
      },
    });
  }
}

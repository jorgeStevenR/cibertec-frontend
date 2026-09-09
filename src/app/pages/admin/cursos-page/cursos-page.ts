import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
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
import { Curso } from '../../../core/models/curso.model';
import { Usuario } from '../../../core/models/usuario.model';
import { extraerMensajeError } from '../../../core/utils/http-error.util';
import { formatearFecha } from '../../../core/utils/labels.util';

const TAMANO_PAGINA = 20;
// Los cursos se pagina de a 20, pero el dropdown de profesores necesita "todos"
// para poder asignar cualquiera; el backend no ofrece un endpoint sin paginar,
// así que pedimos una página grande de una sola vez.
const TAMANO_LOOKUP_PROFESORES = 500;

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
  private readonly fb = inject(FormBuilder);

  readonly cursos = signal<Curso[]>([]);
  readonly profesores = signal<Usuario[]>([]);
  readonly cargando = signal(false);
  readonly error = signal('');

  readonly pagina = signal(0);
  readonly totalPaginas = signal(1);
  readonly totalElementos = signal(0);

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
    publicado: [false],
  });

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    forkJoin({
      cursos: this.cursoService.listar({ pagina: this.pagina(), tamano: TAMANO_PAGINA }),
      usuarios: this.usuarioService.listar({ tamano: TAMANO_LOOKUP_PROFESORES }),
    }).subscribe({
      next: ({ cursos, usuarios }) => {
        this.cursos.set(cursos.contenido);
        this.totalPaginas.set(cursos.totalPaginas);
        this.totalElementos.set(cursos.totalElementos);
        this.profesores.set(usuarios.contenido.filter((u) => u.rol === 'PROFESOR'));
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

  abrirCrear(): void {
    this.modoEdicion.set(false);
    this.cursoEditando.set(null);
    this.form.reset({ titulo: '', descripcion: '', profesorId: '', publicado: false });
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
        })
      : this.cursoService.crear({
          titulo: valores.titulo!,
          descripcion: valores.descripcion ?? '',
          profesorId: Number(valores.profesorId),
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

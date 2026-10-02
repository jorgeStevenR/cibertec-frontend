import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { FormField } from '../../../shared/ui/molecules/form-field/form-field';
import { TextareaField } from '../../../shared/ui/molecules/textarea-field/textarea-field';
import { SelectField } from '../../../shared/ui/molecules/select-field/select-field';
import { PageHeader } from '../../../shared/ui/molecules/page-header/page-header';
import { PanelSeccion } from '../../../shared/ui/molecules/panel-seccion/panel-seccion';
import { UiModal } from '../../../shared/ui/molecules/ui-modal/ui-modal';
import { UiButton } from '../../../shared/ui/atoms/ui-button/ui-button';
import { UiAlert } from '../../../shared/ui/atoms/ui-alert/ui-alert';
import { UiSelectOption } from '../../../shared/ui/atoms/ui-select/ui-select';
import { DataTable, DataTableColumn } from '../../../shared/ui/organisms/data-table/data-table';
import { ConfirmDialog } from '../../../shared/ui/organisms/confirm-dialog/confirm-dialog';
import { ProgramaService } from '../../../core/services/programa.service';
import { CursoService } from '../../../core/services/curso.service';
import { MatriculaProgramaService } from '../../../core/services/matricula-programa.service';
import { UsuarioService } from '../../../core/services/usuario.service';
import { Programa } from '../../../core/models/programa.model';
import { Curso } from '../../../core/models/curso.model';
import { MatriculaPrograma } from '../../../core/models/matricula-programa.model';
import { Usuario } from '../../../core/models/usuario.model';
import { extraerMensajeError } from '../../../core/utils/http-error.util';
import { formatearFecha } from '../../../core/utils/labels.util';

// El backend pagina /api/usuarios (default 20), pero acá necesitamos "todos" para
// poblar el dropdown de matrícula y resolver nombres.
const TAMANO_LOOKUP_USUARIOS = 500;
const TAMANO_LOOKUP_CURSOS = 500;

@Component({
  selector: 'app-programa-detalle-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    FormField,
    TextareaField,
    SelectField,
    PageHeader,
    PanelSeccion,
    UiModal,
    UiButton,
    UiAlert,
    DataTable,
    ConfirmDialog,
  ],
  templateUrl: './programa-detalle-page.html',
  styleUrl: './programa-detalle-page.scss',
})
export class ProgramaDetallePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly programaService = inject(ProgramaService);
  private readonly cursoService = inject(CursoService);
  private readonly matriculaProgramaService = inject(MatriculaProgramaService);
  private readonly usuarioService = inject(UsuarioService);
  private readonly fb = inject(FormBuilder);

  readonly programaId = Number(this.route.snapshot.paramMap.get('programaId'));

  readonly programa = signal<Programa | null>(null);
  readonly cursos = signal<Curso[]>([]);
  readonly matriculas = signal<MatriculaPrograma[]>([]);
  readonly usuarios = signal<Usuario[]>([]);
  readonly cargando = signal(false);
  readonly cargandoCursos = signal(false);
  readonly cargandoMatriculas = signal(false);
  readonly error = signal('');
  readonly tabActiva = signal<'cursos' | 'estudiantes'>('cursos');

  readonly cursoColumnas: DataTableColumn<Curso>[] = [
    { key: 'titulo', label: 'Título' },
    { key: 'profesor', label: 'Profesor', format: (c) => c.profesorNombre ?? `#${c.profesorId}` },
    {
      key: 'publicado',
      label: 'Estado',
      badge: (c) => c.publicado,
      badgeLabels: ['Publicado', 'Borrador'],
    },
  ];

  readonly matriculaColumnas: DataTableColumn<MatriculaPrograma>[] = [
    { key: 'estudiante', label: 'Estudiante', format: (m) => this.nombreEstudiante(m.estudianteId) },
    { key: 'fechaMatricula', label: 'Matriculado', format: (m) => formatearFecha(m.fechaMatricula) },
  ];

  readonly matriculaModalAbierto = signal(false);
  readonly matriculando = signal(false);
  readonly confirmEliminarMatriculaAbierto = signal(false);
  readonly matriculaAEliminar = signal<MatriculaPrograma | null>(null);
  readonly eliminandoMatricula = signal(false);

  readonly matriculaForm = this.fb.group({
    estudianteId: ['', [Validators.required]],
  });

  readonly programaForm = this.fb.group({
    nombre: ['', [Validators.required]],
    descripcion: [''],
    duracionSemestres: [1, [Validators.required, Validators.min(1)]],
  });
  readonly guardandoPrograma = signal(false);
  readonly guardadoOk = signal(false);
  readonly confirmEliminarProgramaAbierto = signal(false);
  readonly eliminandoPrograma = signal(false);

  ngOnInit(): void {
    this.error.set('');
    this.cargarPrograma();
    this.cargarCursos();
    this.cargarMatriculas();
  }

  // Las tres cargas van por separado: el listado de cursos del backend es lento
  // (resuelve profesor y programa curso por curso), y no debe frenar el
  // formulario del programa ni la pestaña de estudiantes.
  private cargarPrograma(): void {
    this.cargando.set(true);
    this.programaService.obtener(this.programaId).subscribe({
      next: (programa) => {
        this.programa.set(programa);
        this.llenarFormularioPrograma(programa);
        this.cargando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.cargando.set(false);
        this.error.set(extraerMensajeError(err));
      },
    });
  }

  private cargarCursos(): void {
    this.cargandoCursos.set(true);
    this.cursoService.listar({ programaId: this.programaId, tamano: TAMANO_LOOKUP_CURSOS }).subscribe({
      next: (cursos) => {
        this.cursos.set(cursos.contenido);
        this.cargandoCursos.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.cargandoCursos.set(false);
        this.error.set(extraerMensajeError(err));
      },
    });
  }

  // Matrículas y usuarios van juntos: los usuarios resuelven los nombres de la tabla.
  private cargarMatriculas(): void {
    this.cargandoMatriculas.set(true);
    forkJoin({
      matriculas: this.matriculaProgramaService.listarPorPrograma(this.programaId),
      usuarios: this.usuarioService.listar({ tamano: TAMANO_LOOKUP_USUARIOS }),
    }).subscribe({
      next: ({ matriculas, usuarios }) => {
        this.matriculas.set(matriculas);
        this.usuarios.set(usuarios.contenido);
        this.cargandoMatriculas.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.cargandoMatriculas.set(false);
        this.error.set(extraerMensajeError(err));
      },
    });
  }

  nombreEstudiante(id: number): string {
    const estudiante = this.usuarios().find((u) => u.id === id);
    return estudiante ? `${estudiante.nombre} ${estudiante.apellido}` : `#${id}`;
  }

  get estudiantesDisponibles(): UiSelectOption[] {
    const matriculadosIds = new Set(this.matriculas().map((m) => m.estudianteId));
    return this.usuarios()
      .filter((u) => u.rol === 'ESTUDIANTE' && !matriculadosIds.has(u.id))
      .map((u) => ({ value: String(u.id), label: `${u.nombre} ${u.apellido}` }));
  }

  // --- Datos del programa ---

  private llenarFormularioPrograma(programa: Programa): void {
    this.programaForm.reset({
      nombre: programa.nombre,
      descripcion: programa.descripcion,
      duracionSemestres: programa.duracionSemestres,
    });
  }

  guardarPrograma(): void {
    if (this.programaForm.invalid) {
      this.programaForm.markAllAsTouched();
      return;
    }

    this.guardandoPrograma.set(true);
    this.guardadoOk.set(false);
    this.error.set('');
    const valores = this.programaForm.getRawValue();
    this.programaService
      .actualizar(this.programaId, {
        nombre: valores.nombre!,
        descripcion: valores.descripcion ?? '',
        duracionSemestres: Number(valores.duracionSemestres),
      })
      .subscribe({
        next: (programa) => {
          this.guardandoPrograma.set(false);
          this.programa.set(programa);
          this.llenarFormularioPrograma(programa);
          this.guardadoOk.set(true);
        },
        error: (err: HttpErrorResponse) => {
          this.guardandoPrograma.set(false);
          this.error.set(extraerMensajeError(err));
        },
      });
  }

  confirmarEliminarPrograma(): void {
    this.eliminandoPrograma.set(true);
    this.programaService.eliminar(this.programaId).subscribe({
      next: () => {
        this.eliminandoPrograma.set(false);
        this.confirmEliminarProgramaAbierto.set(false);
        this.router.navigate(['/admin', 'programas']);
      },
      error: (err: HttpErrorResponse) => {
        this.eliminandoPrograma.set(false);
        this.confirmEliminarProgramaAbierto.set(false);
        this.error.set(extraerMensajeError(err));
      },
    });
  }

  // --- Matrículas ---

  abrirMatricular(): void {
    this.matriculaForm.reset({ estudianteId: '' });
    this.matriculaModalAbierto.set(true);
  }

  cerrarModalMatricula(): void {
    this.matriculaModalAbierto.set(false);
  }

  matricular(): void {
    if (this.matriculaForm.invalid) {
      this.matriculaForm.markAllAsTouched();
      return;
    }

    this.matriculando.set(true);
    this.error.set('');
    this.matriculaProgramaService
      .matricular({ programaId: this.programaId, estudianteId: Number(this.matriculaForm.getRawValue().estudianteId) })
      .subscribe({
        next: () => {
          this.matriculando.set(false);
          this.matriculaModalAbierto.set(false);
          this.cargarMatriculas();
        },
        error: (err: HttpErrorResponse) => {
          this.matriculando.set(false);
          this.error.set(extraerMensajeError(err));
        },
      });
  }

  pedirEliminarMatricula(matricula: MatriculaPrograma): void {
    this.matriculaAEliminar.set(matricula);
    this.confirmEliminarMatriculaAbierto.set(true);
  }

  confirmarEliminarMatricula(): void {
    const matricula = this.matriculaAEliminar();
    if (!matricula) {
      return;
    }

    this.eliminandoMatricula.set(true);
    this.matriculaProgramaService.eliminar(matricula.id).subscribe({
      next: () => {
        this.eliminandoMatricula.set(false);
        this.confirmEliminarMatriculaAbierto.set(false);
        this.cargarMatriculas();
      },
      error: (err: HttpErrorResponse) => {
        this.eliminandoMatricula.set(false);
        this.confirmEliminarMatriculaAbierto.set(false);
        this.error.set(extraerMensajeError(err));
      },
    });
  }
}

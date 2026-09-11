import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { SelectField } from '../../../shared/ui/molecules/select-field/select-field';
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
    SelectField,
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

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    forkJoin({
      programa: this.programaService.obtener(this.programaId),
      cursos: this.cursoService.listar({ programaId: this.programaId, tamano: TAMANO_LOOKUP_CURSOS }),
      matriculas: this.matriculaProgramaService.listarPorPrograma(this.programaId),
      usuarios: this.usuarioService.listar({ tamano: TAMANO_LOOKUP_USUARIOS }),
    }).subscribe({
      next: ({ programa, cursos, matriculas, usuarios }) => {
        this.programa.set(programa);
        this.cursos.set(cursos.contenido);
        this.matriculas.set(matriculas);
        this.usuarios.set(usuarios.contenido);
        this.cargando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.cargando.set(false);
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
          this.cargar();
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
        this.cargar();
      },
      error: (err: HttpErrorResponse) => {
        this.eliminandoMatricula.set(false);
        this.confirmEliminarMatriculaAbierto.set(false);
        this.error.set(extraerMensajeError(err));
      },
    });
  }
}

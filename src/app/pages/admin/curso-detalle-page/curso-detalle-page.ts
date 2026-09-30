import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { FormField } from '../../../shared/ui/molecules/form-field/form-field';
import { SelectField } from '../../../shared/ui/molecules/select-field/select-field';
import { CursoDatos } from '../../../shared/ui/molecules/curso-datos/curso-datos';
import { UiModal } from '../../../shared/ui/molecules/ui-modal/ui-modal';
import { UiButton } from '../../../shared/ui/atoms/ui-button/ui-button';
import { UiAlert } from '../../../shared/ui/atoms/ui-alert/ui-alert';
import { UiSelectOption } from '../../../shared/ui/atoms/ui-select/ui-select';
import { DataTable, DataTableColumn } from '../../../shared/ui/organisms/data-table/data-table';
import { ConfirmDialog } from '../../../shared/ui/organisms/confirm-dialog/confirm-dialog';
import { CursoService } from '../../../core/services/curso.service';
import { ModuloService } from '../../../core/services/modulo.service';
import { MatriculaService } from '../../../core/services/matricula.service';
import { UsuarioService } from '../../../core/services/usuario.service';
import { Curso } from '../../../core/models/curso.model';
import { Modulo } from '../../../core/models/modulo.model';
import { Matricula } from '../../../core/models/matricula.model';
import { Usuario } from '../../../core/models/usuario.model';
import { extraerMensajeError } from '../../../core/utils/http-error.util';
import { formatearFecha } from '../../../core/utils/labels.util';
import { aplanarArbol, armarArbolModulos } from '../../../core/utils/modulo-arbol.util';
import { datosAcademicosCompletos, estadoCupo } from '../../../core/utils/curso.util';

// El backend pagina /api/usuarios (default 20), pero acá necesitamos "todos"
// para poder buscar nombres de profesor/estudiante y poblar el dropdown de matrícula.
const TAMANO_LOOKUP_USUARIOS = 500;

@Component({
  selector: 'app-curso-detalle-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    FormField,
    SelectField,
    CursoDatos,
    UiModal,
    UiButton,
    UiAlert,
    DataTable,
    ConfirmDialog,
  ],
  templateUrl: './curso-detalle-page.html',
  styleUrl: './curso-detalle-page.scss',
})
export class CursoDetallePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly cursoService = inject(CursoService);
  private readonly moduloService = inject(ModuloService);
  private readonly matriculaService = inject(MatriculaService);
  private readonly usuarioService = inject(UsuarioService);
  private readonly fb = inject(FormBuilder);

  readonly cursoId = Number(this.route.snapshot.paramMap.get('cursoId'));

  readonly curso = signal<Curso | null>(null);
  readonly cursoLleno = computed(() => {
    const curso = this.curso();
    return curso !== null && estadoCupo(curso.matriculados, curso.cupoMaximo) === 'lleno';
  });
  readonly faltanDatosAcademicos = computed(() => {
    const curso = this.curso();
    return curso !== null && !datosAcademicosCompletos(curso);
  });
  readonly modulos = signal<Modulo[]>([]);
  readonly matriculas = signal<Matricula[]>([]);
  readonly usuarios = signal<Usuario[]>([]);
  readonly cargando = signal(false);
  readonly error = signal('');
  readonly tabActiva = signal<'modulos' | 'matriculas'>('modulos');
  readonly actualizandoEstado = signal(false);

  readonly moduloColumnas: DataTableColumn<Modulo>[] = [
    // Sin columna 'Orden': la tabla ya sale en orden de árbol y el backend numera desde 0.
    // Los submódulos se muestran debajo de su módulo padre, marcados con ↳.
    { key: 'titulo', label: 'Título', format: (m) => (m.moduloPadreId === null ? m.titulo : `↳ ${m.titulo}`) },
  ];

  readonly matriculaColumnas: DataTableColumn<Matricula>[] = [
    { key: 'estudiante', label: 'Estudiante', format: (m) => this.nombreEstudiante(m.estudianteId) },
    { key: 'fechaMatricula', label: 'Matriculado', format: (m) => formatearFecha(m.fechaMatricula) },
  ];

  readonly moduloModalAbierto = signal(false);
  readonly moduloModoEdicion = signal(false);
  readonly moduloEditando = signal<Modulo | null>(null);
  readonly guardandoModulo = signal(false);
  readonly confirmEliminarModuloAbierto = signal(false);
  readonly moduloAEliminar = signal<Modulo | null>(null);
  readonly eliminandoModulo = signal(false);

  readonly moduloForm = this.fb.group({
    titulo: ['', [Validators.required]],
    orden: [1, [Validators.required, Validators.min(0)]],
  });

  readonly matriculaModalAbierto = signal(false);
  readonly matriculando = signal(false);
  // El error de matricular se muestra dentro del modal: la alerta de la página queda tapada por él.
  readonly matriculaError = signal('');
  readonly confirmEliminarMatriculaAbierto = signal(false);
  readonly matriculaAEliminar = signal<Matricula | null>(null);
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
      curso: this.cursoService.obtener(this.cursoId),
      modulos: this.moduloService.listarPorCurso(this.cursoId),
      matriculas: this.matriculaService.listarPorCurso(this.cursoId),
      usuarios: this.usuarioService.listar({ tamano: TAMANO_LOOKUP_USUARIOS }),
    }).subscribe({
      next: ({ curso, modulos, matriculas, usuarios }) => {
        this.curso.set(curso);
        this.modulos.set(aplanarArbol(armarArbolModulos(modulos)));
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

  nombreProfesor(id: number | undefined): string {
    if (id == null) return '—';
    const profesor = this.usuarios().find((u) => u.id === id);
    return profesor ? `${profesor.nombre} ${profesor.apellido}` : `#${id}`;
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

  togglePublicado(): void {
    const curso = this.curso();
    if (!curso) {
      return;
    }
    // El PUT reemplaza todo el curso y el backend exige código, período y fechas al administrador:
    // un curso anterior a esos datos no se puede publicar hasta completarlos en «Editar curso».
    const { codigo, periodo, fechaInicio, fechaFin } = curso;
    if (!codigo || !periodo || !fechaInicio || !fechaFin) {
      this.error.set('Completa el código, el período y las fechas del curso en «Editar curso» para poder cambiar su estado.');
      return;
    }

    this.actualizandoEstado.set(true);
    this.error.set('');
    this.cursoService
      .actualizar(curso.id, {
        titulo: curso.titulo,
        descripcion: curso.descripcion,
        publicado: !curso.publicado,
        programaId: curso.programaId,
        codigo,
        periodo,
        cupoMaximo: curso.cupoMaximo,
        fechaInicio,
        fechaFin,
      })
      .subscribe({
        next: (actualizado) => {
          this.curso.set(actualizado);
          this.actualizandoEstado.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.actualizandoEstado.set(false);
          this.error.set(extraerMensajeError(err));
        },
      });
  }

  // --- Módulos ---

  abrirCrearModulo(): void {
    this.moduloModoEdicion.set(false);
    this.moduloEditando.set(null);
    // El admin crea módulos principales; el orden es relativo a sus hermanos (las raíces).
    const raices = this.modulos().filter((m) => m.moduloPadreId === null);
    const siguienteOrden = raices.length ? Math.max(...raices.map((m) => m.orden)) + 1 : 1;
    this.moduloForm.reset({ titulo: '', orden: siguienteOrden });
    this.moduloModalAbierto.set(true);
  }

  abrirEditarModulo(modulo: Modulo): void {
    this.moduloModoEdicion.set(true);
    this.moduloEditando.set(modulo);
    this.moduloForm.reset({ titulo: modulo.titulo, orden: modulo.orden });
    this.moduloModalAbierto.set(true);
  }

  cerrarModalModulo(): void {
    this.moduloModalAbierto.set(false);
  }

  guardarModulo(): void {
    if (this.moduloForm.invalid) {
      this.moduloForm.markAllAsTouched();
      return;
    }

    this.guardandoModulo.set(true);
    this.error.set('');
    const valores = this.moduloForm.getRawValue();
    const editando = this.moduloModoEdicion() ? this.moduloEditando() : null;

    const obs = editando
      ? this.moduloService.actualizar(editando.id, {
          titulo: valores.titulo!,
          orden: Number(valores.orden),
          // Se conserva el padre: omitirlo movería un submódulo a la raíz.
          moduloPadreId: editando.moduloPadreId,
        })
      : this.moduloService.crear(this.cursoId, { titulo: valores.titulo!, orden: Number(valores.orden), moduloPadreId: null });

    obs.subscribe({
      next: () => {
        this.guardandoModulo.set(false);
        this.moduloModalAbierto.set(false);
        this.cargar();
      },
      error: (err: HttpErrorResponse) => {
        this.guardandoModulo.set(false);
        this.error.set(extraerMensajeError(err));
      },
    });
  }

  pedirEliminarModulo(modulo: Modulo): void {
    this.moduloAEliminar.set(modulo);
    this.confirmEliminarModuloAbierto.set(true);
  }

  confirmarEliminarModulo(): void {
    const modulo = this.moduloAEliminar();
    if (!modulo) {
      return;
    }

    this.eliminandoModulo.set(true);
    this.moduloService.eliminar(modulo.id).subscribe({
      next: () => {
        this.eliminandoModulo.set(false);
        this.confirmEliminarModuloAbierto.set(false);
        this.cargar();
      },
      error: (err: HttpErrorResponse) => {
        this.eliminandoModulo.set(false);
        this.confirmEliminarModuloAbierto.set(false);
        this.error.set(extraerMensajeError(err));
      },
    });
  }

  // --- Matrículas ---

  abrirMatricular(): void {
    this.matriculaForm.reset({ estudianteId: '' });
    this.matriculaError.set('');
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
    this.matriculaError.set('');
    this.matriculaService
      .matricular({ cursoId: this.cursoId, estudianteId: Number(this.matriculaForm.getRawValue().estudianteId) })
      .subscribe({
        next: () => {
          this.matriculando.set(false);
          this.matriculaModalAbierto.set(false);
          this.cargar();
        },
        error: (err: HttpErrorResponse) => {
          this.matriculando.set(false);
          // 409 por cupo lleno u otra regla: se muestra el mensaje del backend tal cual y se
          // refresca el curso, porque el cupo pudo llenarse mientras el modal estaba abierto.
          this.matriculaError.set(extraerMensajeError(err));
          this.cursoService.obtener(this.cursoId).subscribe({ next: (curso) => this.curso.set(curso) });
        },
      });
  }

  pedirEliminarMatricula(matricula: Matricula): void {
    this.matriculaAEliminar.set(matricula);
    this.confirmEliminarMatriculaAbierto.set(true);
  }

  confirmarEliminarMatricula(): void {
    const matricula = this.matriculaAEliminar();
    if (!matricula) {
      return;
    }

    this.eliminandoMatricula.set(true);
    this.matriculaService.eliminar(matricula.id).subscribe({
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

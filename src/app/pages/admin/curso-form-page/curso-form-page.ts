import { CommonModule, DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { FormField } from '../../../shared/ui/molecules/form-field/form-field';
import { SelectField } from '../../../shared/ui/molecules/select-field/select-field';
import { TextareaField } from '../../../shared/ui/molecules/textarea-field/textarea-field';
import { PageHeader } from '../../../shared/ui/molecules/page-header/page-header';
import { PanelSeccion } from '../../../shared/ui/molecules/panel-seccion/panel-seccion';
import { UiButton } from '../../../shared/ui/atoms/ui-button/ui-button';
import { UiAlert } from '../../../shared/ui/atoms/ui-alert/ui-alert';
import { UiSelectOption } from '../../../shared/ui/atoms/ui-select/ui-select';
import { ConfirmDialog } from '../../../shared/ui/organisms/confirm-dialog/confirm-dialog';
import { CursoService } from '../../../core/services/curso.service';
import { UsuarioService } from '../../../core/services/usuario.service';
import { ProgramaService } from '../../../core/services/programa.service';
import { Curso } from '../../../core/models/curso.model';
import { Usuario } from '../../../core/models/usuario.model';
import { Programa } from '../../../core/models/programa.model';
import { extraerErroresPorCampo, extraerMensajeError } from '../../../core/utils/http-error.util';
import {
  CampoCursoConError,
  PATRON_PERIODO,
  campoDeMensajeCurso,
  datosAcademicosCompletos,
  rangoFechasValido,
} from '../../../core/utils/curso.util';

// Los selects de profesor/programa necesitan "todos"; el backend no ofrece un
// endpoint sin paginar, así que se pide una página grande de una sola vez.
const TAMANO_LOOKUP = 500;

type CampoFormulario = 'titulo' | 'profesorId' | 'programaId' | 'publicado' | 'descripcion' | CampoCursoConError;

// La fecha de fin depende de la de inicio: el error de rango se marca sobre la fecha de fin.
const finNoAnteriorAInicio: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const inicio = control.parent?.get('fechaInicio')?.value as string | null | undefined;
  return rangoFechasValido(inicio ?? null, control.value as string | null) ? null : { rangoFechas: true };
};

// Una sola pantalla para crear (`/admin/cursos/nuevo`) y editar
// (`/admin/cursos/:cursoId/editar`), en lugar del modal que había en la lista.
@Component({
  selector: 'app-curso-form-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    FormField,
    SelectField,
    TextareaField,
    PageHeader,
    PanelSeccion,
    UiButton,
    UiAlert,
    ConfirmDialog,
  ],
  templateUrl: './curso-form-page.html',
  styleUrl: './curso-form-page.scss',
})
export class CursoFormPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly documento = inject(DOCUMENT);
  private readonly cursoService = inject(CursoService);
  private readonly usuarioService = inject(UsuarioService);
  private readonly programaService = inject(ProgramaService);
  private readonly fb = inject(FormBuilder);

  private readonly cursoId = Number(this.route.snapshot.paramMap.get('cursoId'));
  readonly modoEdicion = this.cursoId > 0;

  readonly curso = signal<Curso | null>(null);
  readonly profesores = signal<Usuario[]>([]);
  readonly programas = signal<Programa[]>([]);
  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly error = signal('');
  readonly confirmEliminarAbierto = signal(false);
  readonly eliminando = signal(false);
  // Mensajes que devolvió el backend para un campo concreto (código repetido, fechas, cupo…).
  private readonly erroresServidor = signal<Partial<Record<CampoFormulario, string>>>({});

  readonly opcionesProfesor = computed<UiSelectOption[]>(() =>
    this.profesores().map((p) => ({ value: String(p.id), label: `${p.nombre} ${p.apellido}` })),
  );
  readonly opcionesPrograma = computed<UiSelectOption[]>(() =>
    this.programas().map((p) => ({ value: String(p.id), label: p.nombre })),
  );
  readonly opcionesEstado: UiSelectOption[] = [
    { value: 'false', label: 'Borrador (los estudiantes no lo ven)' },
    { value: 'true', label: 'Publicado (visible para los estudiantes)' },
  ];

  // Un curso creado antes de los datos académicos se abre con esos campos vacíos.
  readonly faltanDatosAcademicos = computed(() => {
    const curso = this.curso();
    return curso !== null && !datosAcademicosCompletos(curso);
  });

  readonly volverUrl = this.modoEdicion ? ['/admin', 'cursos', this.cursoId] : ['/admin', 'cursos'];
  readonly volverEtiqueta = this.modoEdicion ? 'Volver al curso' : 'Volver a cursos';

  readonly form = this.fb.group({
    titulo: ['', [Validators.required]],
    codigo: ['', [Validators.required, Validators.maxLength(30)]],
    programaId: ['', [Validators.required]],
    profesorId: ['', [Validators.required]],
    periodo: ['', [Validators.required, Validators.pattern(PATRON_PERIODO)]],
    fechaInicio: ['', [Validators.required]],
    fechaFin: ['', [Validators.required, finNoAnteriorAInicio]],
    // Vacío = sin límite; si tiene valor, un entero >= 1.
    cupoMaximo: ['', [Validators.pattern(/^\d+$/), Validators.min(1)]],
    publicado: ['false'],
    descripcion: [''],
  });

  constructor() {
    this.form.controls.fechaInicio.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.form.controls.fechaFin.updateValueAndValidity();
    });
  }

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set('');

    forkJoin({
      usuarios: this.usuarioService.listar({ tamano: TAMANO_LOOKUP }),
      programas: this.programaService.listar({ tamano: TAMANO_LOOKUP }),
      curso: this.modoEdicion ? this.cursoService.obtener(this.cursoId) : of(null),
    }).subscribe({
      next: ({ usuarios, programas, curso }) => {
        this.profesores.set(usuarios.contenido.filter((u) => u.rol === 'PROFESOR'));
        this.programas.set(programas.contenido);
        this.curso.set(curso);

        if (curso) {
          this.form.reset({
            titulo: curso.titulo,
            codigo: curso.codigo ?? '',
            programaId: curso.programaId != null ? String(curso.programaId) : '',
            profesorId: String(curso.profesorId),
            periodo: curso.periodo ?? '',
            fechaInicio: curso.fechaInicio ?? '',
            fechaFin: curso.fechaFin ?? '',
            cupoMaximo: curso.cupoMaximo != null ? String(curso.cupoMaximo) : '',
            publicado: String(curso.publicado),
            descripcion: curso.descripcion ?? '',
          });
          // El backend no permite cambiar el profesor de un curso ya creado.
          this.form.controls.profesorId.disable();
        }

        this.cargando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.cargando.set(false);
        this.error.set(extraerMensajeError(err));
      },
    });
  }

  // Mensaje visible bajo un campo: primero lo que dijo el backend, si no la validación local.
  mensajeCampo(campo: CampoFormulario): string {
    const control = this.form.get(campo);
    if (control?.hasError('servidor')) {
      return this.erroresServidor()[campo] ?? '';
    }

    switch (campo) {
      case 'titulo':
        return 'El título es obligatorio';
      case 'codigo':
        return control?.hasError('maxlength') ? 'El código admite hasta 30 caracteres' : 'El código es obligatorio';
      case 'periodo':
        return control?.hasError('required')
          ? 'El período es obligatorio'
          : 'El período debe tener el formato AAAA-N (ej. 2026-2)';
      case 'fechaInicio':
        return 'La fecha de inicio es obligatoria';
      case 'fechaFin':
        return control?.hasError('rangoFechas')
          ? 'La fecha de fin no puede ser anterior a la de inicio'
          : 'La fecha de fin es obligatoria';
      case 'cupoMaximo':
        return 'El cupo debe ser un número entero de 1 o más (déjalo vacío si no hay límite)';
      case 'programaId':
        return 'Selecciona un programa';
      case 'profesorId':
        return 'Selecciona un profesor';
      default:
        return '';
    }
  }

  guardar(): void {
    // Un error del intento anterior no debe impedir reintentar (por ejemplo, si mientras tanto
    // alguien se desmatriculó): se recalculan las validaciones y el backend vuelve a decidir.
    for (const campo of Object.keys(this.erroresServidor())) {
      this.form.get(campo)?.updateValueAndValidity();
    }
    this.erroresServidor.set({});

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    this.error.set('');
    const valores = this.form.getRawValue();
    const titulo = valores.titulo!.trim();
    const descripcion = valores.descripcion?.trim() ?? '';
    // El código lo normaliza el backend (mayúsculas, sin espacios en los extremos); acá solo se
    // recorta. El cupo vacío se manda como null (sin límite), nunca como 0.
    const codigo = valores.codigo!.trim();
    const periodo = valores.periodo!.trim();
    const cupoTexto = String(valores.cupoMaximo ?? '').trim();
    const cupoMaximo = cupoTexto === '' ? null : Number(cupoTexto);
    const fechaInicio = valores.fechaInicio!;
    const fechaFin = valores.fechaFin!;

    const peticion = this.modoEdicion
      ? this.cursoService.actualizar(this.cursoId, {
          titulo,
          descripcion,
          publicado: valores.publicado === 'true',
          programaId: Number(valores.programaId),
          codigo,
          periodo,
          cupoMaximo,
          fechaInicio,
          fechaFin,
        })
      : this.cursoService.crear({
          titulo,
          descripcion,
          profesorId: Number(valores.profesorId),
          programaId: Number(valores.programaId),
          codigo,
          periodo,
          cupoMaximo,
          fechaInicio,
          fechaFin,
        });

    peticion.subscribe({
      next: (curso) => {
        this.guardando.set(false);
        // Al crear se abre el curso recién creado para seguir con módulos y
        // matrículas; al editar se vuelve al mismo curso.
        this.router.navigate(['/admin', 'cursos', curso.id]);
      },
      error: (err: HttpErrorResponse) => {
        this.guardando.set(false);
        this.mostrarErrorDelServidor(err);
      },
    });
  }

  confirmarEliminar(): void {
    this.eliminando.set(true);
    this.cursoService.eliminar(this.cursoId).subscribe({
      next: () => {
        this.eliminando.set(false);
        this.confirmEliminarAbierto.set(false);
        this.router.navigate(['/admin', 'cursos']);
      },
      error: (err: HttpErrorResponse) => {
        this.eliminando.set(false);
        this.confirmEliminarAbierto.set(false);
        this.error.set(extraerMensajeError(err));
      },
    });
  }

  // Lo que el backend pueda atribuir a un campo se muestra junto a ese campo; el resto
  // (403, JSON inválido, errores de red) queda en la alerta de arriba.
  private mostrarErrorDelServidor(err: HttpErrorResponse): void {
    const asignados = new Map<CampoFormulario, string>();

    const porCampo = extraerErroresPorCampo(err);
    if (porCampo) {
      for (const [campo, mensaje] of Object.entries(porCampo)) {
        if (this.form.contains(campo)) {
          asignados.set(campo as CampoFormulario, mensaje);
        }
      }
    } else {
      const mensaje = extraerMensajeError(err);
      const campo = campoDeMensajeCurso(mensaje);
      if (campo) {
        asignados.set(campo, mensaje);
      }
    }

    if (asignados.size === 0) {
      this.error.set(extraerMensajeError(err));
      return;
    }

    this.erroresServidor.set(Object.fromEntries(asignados));
    for (const campo of asignados.keys()) {
      const control = this.form.get(campo);
      control?.setErrors({ servidor: true });
      control?.markAsTouched();
    }
    // Con varios campos marcados, la alerta recuerda que hay que revisar el formulario.
    if (porCampo) {
      this.error.set('Revisa los campos marcados en el formulario.');
    }
    // Los id de los inputs coinciden con el nombre de cada control.
    const [primero] = asignados.keys();
    this.documento.getElementById(primero)?.focus();
  }
}

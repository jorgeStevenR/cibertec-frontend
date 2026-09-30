import { CommonModule, DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DataTable, DataTableColumn } from '../data-table/data-table';
import { ConfirmDialog } from '../confirm-dialog/confirm-dialog';
import { FormField } from '../../molecules/form-field/form-field';
import { TextareaField } from '../../molecules/textarea-field/textarea-field';
import { CuestionarioService } from '../../../../core/services/cuestionario.service';
import { CuestionarioDetalle, IntentoResumen, Pregunta } from '../../../../core/models/cuestionario.model';
import { extraerMensajeError } from '../../../../core/utils/http-error.util';
import { formatearFecha } from '../../../../core/utils/labels.util';
import {
  construirPreguntaRequest,
  correctaValidator,
  reindexarCorrecta,
} from '../../../../core/utils/cuestionario.util';

type OpcionFormGroup = FormGroup<{
  id: FormControl<number | null>;
  texto: FormControl<string>;
}>;

// Rechaza textos hechos solo de espacios (el backend recibe el valor recortado).
const NO_VACIO = Validators.pattern(/\S/);

@Component({
  selector: 'app-cuestionario-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DataTable, ConfirmDialog, FormField, TextareaField],
  templateUrl: './cuestionario-editor.html',
  styleUrl: './cuestionario-editor.scss',
})
export class CuestionarioEditorComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input({ required: true }) cuestionarioId!: number;
  @Output() cerrado = new EventEmitter<void>();

  @ViewChild('botonCerrar') private botonCerrar?: ElementRef<HTMLButtonElement>;

  private readonly cuestionarioService = inject(CuestionarioService);
  private readonly fb = inject(FormBuilder);
  private readonly documento = inject(DOCUMENT);
  // Elemento que abrió el overlay, para devolverle el foco al cerrarlo.
  private readonly focoPrevio = this.documento.activeElement as HTMLElement | null;

  readonly formatearFecha = formatearFecha;

  readonly detalle = signal<CuestionarioDetalle | null>(null);
  readonly cargando = signal(false);
  readonly error = signal('');
  readonly tabActiva = signal<'preguntas' | 'resultados'>('preguntas');

  readonly intentos = signal<IntentoResumen[]>([]);
  readonly cargandoResultados = signal(false);

  readonly intentoColumnas: DataTableColumn<IntentoResumen>[] = [
    { key: 'estudiante', label: 'Estudiante', format: (i) => i.estudianteNombre || `Estudiante #${i.estudianteId}` },
    { key: 'nota', label: 'Nota', format: (i) => `${i.nota} / ${i.puntajeMaximo}` },
    { key: 'fecha', label: 'Respondido', format: (i) => this.formatearFecha(i.fechaEntrega) },
  ];

  // --- Formulario de pregunta (nueva o edición) ---
  readonly formularioAbierto = signal(false);
  readonly preguntaEditandoId = signal<number | null>(null);
  readonly guardandoPregunta = signal(false);
  readonly errorFormulario = signal('');

  readonly preguntaForm = this.fb.group(
    {
      enunciado: this.fb.nonNullable.control('', [Validators.required, NO_VACIO]),
      puntaje: this.fb.control<number | null>(1, [Validators.required, Validators.min(1)]),
      opciones: this.fb.array<OpcionFormGroup>([this.crearOpcion(), this.crearOpcion()]),
      correcta: this.fb.control<number | null>(null),
    },
    { validators: correctaValidator() },
  );

  readonly confirmEliminarPreguntaAbierto = signal(false);
  readonly preguntaAEliminar = signal<Pregunta | null>(null);
  readonly eliminandoPregunta = signal(false);

  readonly confirmEliminarCuestionarioAbierto = signal(false);
  readonly eliminandoCuestionario = signal(false);

  get opciones(): FormArray<OpcionFormGroup> {
    return this.preguntaForm.controls.opciones;
  }

  ngOnInit(): void {
    this.cargar();
  }

  ngAfterViewInit(): void {
    this.botonCerrar?.nativeElement.focus();
  }

  ngOnDestroy(): void {
    this.focoPrevio?.focus();
  }

  // Escape cierra el overlay, salvo que haya un diálogo de confirmación encima.
  @HostListener('document:keydown.escape')
  cerrarConEscape(): void {
    if (this.confirmEliminarPreguntaAbierto() || this.confirmEliminarCuestionarioAbierto()) {
      return;
    }
    this.cerrar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    this.cuestionarioService.obtener(this.cuestionarioId).subscribe({
      next: (detalle) => {
        this.detalle.set(detalle);
        this.cargando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.cargando.set(false);
        this.error.set(extraerMensajeError(err));
      },
    });
  }

  cerrar(): void {
    this.cerrado.emit();
  }

  // Los resultados se piden cada vez que se entra a la pestaña: mientras el
  // editor está abierto pueden llegar intentos nuevos de los estudiantes.
  seleccionarTab(tab: 'preguntas' | 'resultados'): void {
    this.tabActiva.set(tab);
    if (tab === 'resultados') {
      this.cargarResultados();
    }
  }

  private cargarResultados(): void {
    this.cargandoResultados.set(true);
    this.error.set('');
    this.cuestionarioService.listarIntentos(this.cuestionarioId).subscribe({
      next: (intentos) => {
        this.intentos.set(intentos);
        this.cargandoResultados.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.cargandoResultados.set(false);
        this.error.set(extraerMensajeError(err));
      },
    });
  }

  // --- Formulario de pregunta ---

  private crearOpcion(id: number | null = null, texto = ''): OpcionFormGroup {
    return this.fb.group({
      id: this.fb.control<number | null>(id),
      texto: this.fb.nonNullable.control(texto, [Validators.required, NO_VACIO]),
    });
  }

  private abrirFormulario(
    opciones: OpcionFormGroup[],
    valores: { enunciado: string; puntaje: number; correcta: number | null },
  ): void {
    this.opciones.clear();
    opciones.forEach((o) => this.opciones.push(o));
    this.preguntaForm.reset(valores);
    this.errorFormulario.set('');
    this.formularioAbierto.set(true);
  }

  abrirNuevaPregunta(): void {
    this.preguntaEditandoId.set(null);
    this.abrirFormulario([this.crearOpcion(), this.crearOpcion()], { enunciado: '', puntaje: 1, correcta: null });
  }

  abrirEditarPregunta(pregunta: Pregunta): void {
    this.preguntaEditandoId.set(pregunta.id);
    const idxCorrecta = pregunta.opciones.findIndex((o) => o.esCorrecta);
    this.abrirFormulario(
      pregunta.opciones.map((o) => this.crearOpcion(o.id, o.texto)),
      { enunciado: pregunta.enunciado, puntaje: pregunta.puntaje, correcta: idxCorrecta >= 0 ? idxCorrecta : null },
    );
  }

  cancelarFormulario(): void {
    this.formularioAbierto.set(false);
  }

  agregarOpcion(): void {
    this.opciones.push(this.crearOpcion());
  }

  quitarOpcion(indice: number): void {
    if (this.opciones.length <= 2) {
      return;
    }
    this.opciones.removeAt(indice);
    const correcta = this.preguntaForm.controls.correcta;
    correcta.setValue(reindexarCorrecta(correcta.value, indice));
  }

  opcionInvalida(indice: number): boolean {
    const texto = this.opciones.at(indice).controls.texto;
    return texto.touched && texto.invalid;
  }

  // "Sin correcta" es un error del grupo, no de un control: se muestra recién
  // cuando se intentó guardar (markAllAsTouched marca también "correcta").
  get faltaCorrecta(): boolean {
    return this.preguntaForm.hasError('sinCorrecta') && this.preguntaForm.controls.correcta.touched;
  }

  guardarPregunta(): void {
    if (this.preguntaForm.invalid) {
      this.preguntaForm.markAllAsTouched();
      return;
    }

    this.errorFormulario.set('');
    this.guardandoPregunta.set(true);
    const datos = construirPreguntaRequest(this.preguntaForm.getRawValue());

    const editandoId = this.preguntaEditandoId();
    const obs = editandoId
      ? this.cuestionarioService.actualizarPregunta(editandoId, datos)
      : this.cuestionarioService.crearPregunta(this.cuestionarioId, datos);

    obs.subscribe({
      next: () => {
        this.guardandoPregunta.set(false);
        this.formularioAbierto.set(false);
        this.cargar();
      },
      error: (err: HttpErrorResponse) => {
        this.guardandoPregunta.set(false);
        this.errorFormulario.set(extraerMensajeError(err));
      },
    });
  }

  pedirEliminarPregunta(pregunta: Pregunta): void {
    this.preguntaAEliminar.set(pregunta);
    this.confirmEliminarPreguntaAbierto.set(true);
  }

  confirmarEliminarPregunta(): void {
    const pregunta = this.preguntaAEliminar();
    if (!pregunta) {
      return;
    }
    this.eliminandoPregunta.set(true);
    this.cuestionarioService.eliminarPregunta(pregunta.id).subscribe({
      next: () => {
        this.eliminandoPregunta.set(false);
        this.confirmEliminarPreguntaAbierto.set(false);
        this.cargar();
      },
      error: (err: HttpErrorResponse) => {
        this.eliminandoPregunta.set(false);
        this.confirmEliminarPreguntaAbierto.set(false);
        this.error.set(extraerMensajeError(err));
      },
    });
  }

  pedirEliminarCuestionario(): void {
    this.confirmEliminarCuestionarioAbierto.set(true);
  }

  confirmarEliminarCuestionario(): void {
    this.eliminandoCuestionario.set(true);
    this.cuestionarioService.eliminar(this.cuestionarioId).subscribe({
      next: () => {
        this.eliminandoCuestionario.set(false);
        this.confirmEliminarCuestionarioAbierto.set(false);
        this.cerrado.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.eliminandoCuestionario.set(false);
        this.confirmEliminarCuestionarioAbierto.set(false);
        this.error.set(extraerMensajeError(err));
      },
    });
  }
}

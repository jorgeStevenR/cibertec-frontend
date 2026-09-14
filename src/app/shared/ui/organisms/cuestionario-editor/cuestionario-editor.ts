import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { DataTable, DataTableColumn } from '../data-table/data-table';
import { ConfirmDialog } from '../confirm-dialog/confirm-dialog';
import { CuestionarioService } from '../../../../core/services/cuestionario.service';
import { CuestionarioDetalle, IntentoResumen, OpcionRequest, Pregunta } from '../../../../core/models/cuestionario.model';
import { extraerMensajeError } from '../../../../core/utils/http-error.util';
import { formatearFecha } from '../../../../core/utils/labels.util';

interface OpcionForm {
  id?: number;
  texto: string;
}

@Component({
  selector: 'app-cuestionario-editor',
  standalone: true,
  imports: [CommonModule, DataTable, ConfirmDialog],
  templateUrl: './cuestionario-editor.html',
  styleUrl: './cuestionario-editor.scss',
})
export class CuestionarioEditorComponent implements OnInit {
  @Input({ required: true }) cuestionarioId!: number;
  @Output() cerrado = new EventEmitter<void>();

  private readonly cuestionarioService = inject(CuestionarioService);

  readonly formatearFecha = formatearFecha;

  readonly detalle = signal<CuestionarioDetalle | null>(null);
  readonly cargando = signal(false);
  readonly error = signal('');
  readonly tabActiva = signal<'preguntas' | 'resultados'>('preguntas');

  readonly intentos = signal<IntentoResumen[]>([]);
  readonly cargandoResultados = signal(false);
  private resultadosCargados = false;

  readonly intentoColumnas: DataTableColumn<IntentoResumen>[] = [
    { key: 'estudiante', label: 'Estudiante', format: (i) => i.estudianteNombre || `Estudiante #${i.estudianteId}` },
    { key: 'nota', label: 'Nota', format: (i) => `${i.nota} / ${i.puntajeMaximo}` },
    { key: 'fecha', label: 'Respondido', format: (i) => this.formatearFecha(i.fechaEntrega) },
  ];

  // --- Formulario de pregunta (nueva o edición) ---
  readonly formularioAbierto = signal(false);
  readonly preguntaEditandoId = signal<number | null>(null);
  readonly enunciado = signal('');
  readonly puntaje = signal(1);
  readonly opciones = signal<OpcionForm[]>([{ texto: '' }, { texto: '' }]);
  readonly correctaIndice = signal<number | null>(null);
  readonly guardandoPregunta = signal(false);
  readonly errorFormulario = signal('');

  readonly confirmEliminarPreguntaAbierto = signal(false);
  readonly preguntaAEliminar = signal<Pregunta | null>(null);
  readonly eliminandoPregunta = signal(false);

  readonly confirmEliminarCuestionarioAbierto = signal(false);
  readonly eliminandoCuestionario = signal(false);

  ngOnInit(): void {
    this.cargar();
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

  seleccionarTab(tab: 'preguntas' | 'resultados'): void {
    this.tabActiva.set(tab);
    if (tab === 'resultados' && !this.resultadosCargados) {
      this.cargarResultados();
    }
  }

  private cargarResultados(): void {
    this.cargandoResultados.set(true);
    this.cuestionarioService.listarIntentos(this.cuestionarioId).subscribe({
      next: (intentos) => {
        this.intentos.set(intentos);
        this.resultadosCargados = true;
        this.cargandoResultados.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.cargandoResultados.set(false);
        this.error.set(extraerMensajeError(err));
      },
    });
  }

  // --- Formulario de pregunta ---

  abrirNuevaPregunta(): void {
    this.preguntaEditandoId.set(null);
    this.enunciado.set('');
    this.puntaje.set(1);
    this.opciones.set([{ texto: '' }, { texto: '' }]);
    this.correctaIndice.set(null);
    this.errorFormulario.set('');
    this.formularioAbierto.set(true);
  }

  abrirEditarPregunta(pregunta: Pregunta): void {
    this.preguntaEditandoId.set(pregunta.id);
    this.enunciado.set(pregunta.enunciado);
    this.puntaje.set(pregunta.puntaje);
    this.opciones.set(pregunta.opciones.map((o) => ({ id: o.id, texto: o.texto })));
    const idxCorrecta = pregunta.opciones.findIndex((o) => o.esCorrecta);
    this.correctaIndice.set(idxCorrecta >= 0 ? idxCorrecta : null);
    this.errorFormulario.set('');
    this.formularioAbierto.set(true);
  }

  cancelarFormulario(): void {
    this.formularioAbierto.set(false);
  }

  actualizarTextoOpcion(indice: number, texto: string): void {
    const lista = [...this.opciones()];
    lista[indice] = { ...lista[indice], texto };
    this.opciones.set(lista);
  }

  agregarOpcion(): void {
    this.opciones.set([...this.opciones(), { texto: '' }]);
  }

  quitarOpcion(indice: number): void {
    if (this.opciones().length <= 2) {
      return;
    }
    const lista = this.opciones().filter((_, i) => i !== indice);
    this.opciones.set(lista);
    const correcta = this.correctaIndice();
    if (correcta === indice) {
      this.correctaIndice.set(null);
    } else if (correcta !== null && correcta > indice) {
      this.correctaIndice.set(correcta - 1);
    }
  }

  guardarPregunta(): void {
    const enunciado = this.enunciado().trim();
    const opcionesTexto = this.opciones().map((o) => o.texto.trim());
    const correcta = this.correctaIndice();

    if (!enunciado) {
      this.errorFormulario.set('Escribe el enunciado de la pregunta.');
      return;
    }
    if (opcionesTexto.some((t) => !t)) {
      this.errorFormulario.set('Completa el texto de todas las opciones.');
      return;
    }
    if (correcta === null) {
      this.errorFormulario.set('Marca cuál opción es la correcta.');
      return;
    }

    this.errorFormulario.set('');
    this.guardandoPregunta.set(true);
    const opciones: OpcionRequest[] = this.opciones().map((o, i) => ({
      id: o.id,
      texto: o.texto.trim(),
      esCorrecta: i === correcta,
    }));
    const datos = { enunciado, puntaje: Number(this.puntaje()), opciones };

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

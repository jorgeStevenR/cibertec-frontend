import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { FormField } from '../../../shared/ui/molecules/form-field/form-field';
import { TextareaField } from '../../../shared/ui/molecules/textarea-field/textarea-field';
import { UiModal } from '../../../shared/ui/molecules/ui-modal/ui-modal';
import { Pagination } from '../../../shared/ui/molecules/pagination/pagination';
import { UiButton } from '../../../shared/ui/atoms/ui-button/ui-button';
import { UiAlert } from '../../../shared/ui/atoms/ui-alert/ui-alert';
import { DataTable, DataTableColumn } from '../../../shared/ui/organisms/data-table/data-table';
import { ConfirmDialog } from '../../../shared/ui/organisms/confirm-dialog/confirm-dialog';
import { ProgramaService } from '../../../core/services/programa.service';
import { Programa } from '../../../core/models/programa.model';
import { extraerMensajeError } from '../../../core/utils/http-error.util';

const TAMANO_PAGINA = 20;

@Component({
  selector: 'app-programas-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    FormField,
    TextareaField,
    UiModal,
    Pagination,
    UiButton,
    UiAlert,
    DataTable,
    ConfirmDialog,
  ],
  templateUrl: './programas-page.html',
  styleUrl: './programas-page.scss',
})
export class ProgramasPage implements OnInit {
  private readonly programaService = inject(ProgramaService);
  private readonly fb = inject(FormBuilder);
  private readonly busquedaSubject = new Subject<string>();

  readonly programas = signal<Programa[]>([]);
  readonly cargando = signal(false);
  readonly error = signal('');

  readonly busqueda = signal('');
  readonly pagina = signal(0);
  readonly totalPaginas = signal(1);
  readonly totalElementos = signal(0);

  readonly modalAbierto = signal(false);
  readonly modoEdicion = signal(false);
  readonly programaEditando = signal<Programa | null>(null);
  readonly guardando = signal(false);

  readonly confirmEliminarAbierto = signal(false);
  readonly programaAEliminar = signal<Programa | null>(null);
  readonly eliminando = signal(false);

  readonly columnas: DataTableColumn<Programa>[] = [
    { key: 'nombre', label: 'Nombre' },
    { key: 'duracionSemestres', label: 'Duración', format: (p) => `${p.duracionSemestres} semestres` },
  ];

  readonly form = this.fb.group({
    nombre: ['', [Validators.required]],
    descripcion: [''],
    duracionSemestres: [1, [Validators.required, Validators.min(1)]],
  });

  constructor() {
    this.busquedaSubject
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((valor) => {
        this.busqueda.set(valor);
        this.pagina.set(0);
        this.cargar();
      });
  }

  ngOnInit(): void {
    this.cargar();
  }

  onBusquedaInput(valor: string): void {
    this.busquedaSubject.next(valor);
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    this.programaService
      .listar({ pagina: this.pagina(), tamano: TAMANO_PAGINA, busqueda: this.busqueda() })
      .subscribe({
        next: (respuesta) => {
          this.programas.set(respuesta.contenido);
          this.totalPaginas.set(respuesta.totalPaginas);
          this.totalElementos.set(respuesta.totalElementos);
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

  abrirCrear(): void {
    this.modoEdicion.set(false);
    this.programaEditando.set(null);
    this.form.reset({ nombre: '', descripcion: '', duracionSemestres: 1 });
    this.modalAbierto.set(true);
  }

  abrirEditar(programa: Programa): void {
    this.modoEdicion.set(true);
    this.programaEditando.set(programa);
    this.form.reset({
      nombre: programa.nombre,
      descripcion: programa.descripcion,
      duracionSemestres: programa.duracionSemestres,
    });
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
    const datos = {
      nombre: valores.nombre!,
      descripcion: valores.descripcion ?? '',
      duracionSemestres: Number(valores.duracionSemestres),
    };
    const editando = this.modoEdicion() ? this.programaEditando() : null;

    const obs = editando ? this.programaService.actualizar(editando.id, datos) : this.programaService.crear(datos);

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

  pedirEliminar(programa: Programa): void {
    this.programaAEliminar.set(programa);
    this.confirmEliminarAbierto.set(true);
  }

  confirmarEliminar(): void {
    const programa = this.programaAEliminar();
    if (!programa) {
      return;
    }

    this.eliminando.set(true);
    this.programaService.eliminar(programa.id).subscribe({
      next: () => {
        this.eliminando.set(false);
        this.confirmEliminarAbierto.set(false);
        if (this.programas().length === 1 && this.pagina() > 0) {
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

import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { UiAlert } from '../../../shared/ui/atoms/ui-alert/ui-alert';
import { DataTable, DataTableCellDirective, DataTableColumn } from '../../../shared/ui/organisms/data-table/data-table';
import { EstudianteAvanceService } from '../../../core/services/estudiante-avance.service';
import { AuthService } from '../../../core/services/auth.service';
import { CalificacionItem, CalificacionesCurso } from '../../../core/models/estudiante-avance.model';
import { extraerMensajeError } from '../../../core/utils/http-error.util';
import { formatearRangoFechas } from '../../../core/utils/curso.util';
import {
  ESTADO_CALIFICACION_LABELS,
  TIPO_ITEM_LABELS,
  formatearFecha,
  formatearPuntaje,
  porcentajePuntaje,
} from '../../../core/utils/labels.util';

@Component({
  selector: 'app-estudiante-calificaciones-page',
  standalone: true,
  imports: [CommonModule, UiAlert, DataTable, DataTableCellDirective],
  templateUrl: './calificaciones-page.html',
  styleUrl: './calificaciones-page.scss',
})
export class EstudianteCalificacionesPage implements OnInit {
  private readonly avanceService = inject(EstudianteAvanceService);
  private readonly auth = inject(AuthService);

  readonly cursos = signal<CalificacionesCurso[]>([]);
  readonly cargando = signal(false);
  readonly error = signal('');

  readonly formatearPuntaje = formatearPuntaje;
  readonly formatearRangoFechas = formatearRangoFechas;

  readonly columnas: DataTableColumn<CalificacionItem>[] = [
    { key: 'titulo', label: 'Ítem' },
    { key: 'modulo', label: 'Módulo', format: (i) => i.moduloTitulo },
    { key: 'nota', label: 'Nota', format: (i) => this.textoNota(i) },
    { key: 'estado', label: 'Estado' },
    { key: 'entrega', label: 'Entrega', format: (i) => (i.fechaEntrega ? formatearFecha(i.fechaEntrega) : '—') },
    { key: 'comentario', label: 'Comentario del docente' },
  ];

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    const usuario = this.auth.usuarioActual();
    if (!usuario) {
      return;
    }

    this.cargando.set(true);
    this.error.set('');
    this.avanceService.calificaciones(usuario.id).subscribe({
      next: (cursos) => {
        this.cursos.set(cursos);
        this.cargando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.cargando.set(false);
        this.error.set(extraerMensajeError(err));
      },
    });
  }

  etiquetaTipo(item: CalificacionItem): string {
    return TIPO_ITEM_LABELS[item.tipo];
  }

  etiquetaEstado(item: CalificacionItem): string {
    return ESTADO_CALIFICACION_LABELS[item.estado];
  }

  porcentaje(curso: CalificacionesCurso): number | null {
    return porcentajePuntaje(curso.puntajeObtenido, curso.puntajeMaximoCalificado);
  }

  private textoNota(item: CalificacionItem): string {
    return item.nota == null ? '—' : `${formatearPuntaje(item.nota)} / ${formatearPuntaje(item.puntajeMaximo)}`;
  }
}

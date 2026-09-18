import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UiAlert } from '../../shared/ui/atoms/ui-alert/ui-alert';
import { GraficoArea } from '../../shared/ui/molecules/grafico-area/grafico-area';
import { GraficoBarras } from '../../shared/ui/molecules/grafico-barras/grafico-barras';
import { GraficoDona } from '../../shared/ui/molecules/grafico-dona/grafico-dona';
import { KpiTile } from '../../shared/ui/molecules/kpi-tile/kpi-tile';
import { PageHeader } from '../../shared/ui/molecules/page-header/page-header';
import { PanelSeccion } from '../../shared/ui/molecules/panel-seccion/panel-seccion';
import { UsuarioService } from '../../core/services/usuario.service';
import { Usuario } from '../../core/models/usuario.model';
import { extraerMensajeError } from '../../core/utils/http-error.util';
import { ItemBarra, SegmentoDona } from '../../core/utils/graficos.util';
import { ROL_LABELS, formatearFecha } from '../../core/utils/labels.util';
import { COLOR_ROL, ResumenUsuarios, TAMANO_MUESTRA_RESUMEN, resumirUsuarios } from '../../core/utils/resumen.util';

interface DatosInicioGestor {
  totalCuentas: number;
  estudiantes: number;
  estudiantesActivos: number;
  profesores: number;
  profesoresActivos: number;
  resumen: ResumenUsuarios;
  segmentosRoles: SegmentoDona[];
  barrasEstado: ItemBarra[];
  parcial: boolean;
}

@Component({
  selector: 'app-gestor-usuarios-inicio-page',
  standalone: true,
  imports: [CommonModule, RouterLink, UiAlert, GraficoArea, GraficoBarras, GraficoDona, KpiTile, PageHeader, PanelSeccion],
  templateUrl: './gestor-usuarios-inicio-page.html',
  styleUrl: './gestor-usuarios-inicio-page.scss',
})
export class GestorUsuariosInicioPage implements OnInit {
  private readonly usuarioService = inject(UsuarioService);

  readonly datos = signal<DatosInicioGestor | null>(null);
  readonly cargando = signal(false);
  readonly error = signal('');

  readonly formatearFecha = formatearFecha;
  readonly rolLabels = ROL_LABELS;

  ngOnInit(): void {
    this.cargar();
  }

  iniciales(usuario: Usuario): string {
    return `${usuario.nombre.charAt(0)}${usuario.apellido.charAt(0)}`.toUpperCase();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set('');

    this.usuarioService.listar({ tamano: TAMANO_MUESTRA_RESUMEN }).subscribe({
      next: (pagina) => {
        const resumen = resumirUsuarios(pagina.contenido, new Date());
        const estudiantes = resumen.porRol.find((r) => r.rol === 'ESTUDIANTE');
        const profesores = resumen.porRol.find((r) => r.rol === 'PROFESOR');

        this.datos.set({
          totalCuentas: pagina.totalElementos,
          estudiantes: estudiantes?.total ?? 0,
          estudiantesActivos: estudiantes?.activos ?? 0,
          profesores: profesores?.total ?? 0,
          profesoresActivos: profesores?.activos ?? 0,
          resumen,
          segmentosRoles: resumen.porRol.map((r) => ({ etiqueta: r.etiqueta, valor: r.total, color: COLOR_ROL[r.rol] })),
          barrasEstado: resumen.porRol
            .filter((r) => r.total > 0)
            .map((r) => ({ etiqueta: r.etiqueta, valor: r.activos, extra: r.inactivos })),
          parcial: pagina.totalElementos > pagina.contenido.length,
        });
        this.cargando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.cargando.set(false);
        this.error.set(extraerMensajeError(err));
      },
    });
  }
}

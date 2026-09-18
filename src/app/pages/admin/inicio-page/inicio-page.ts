import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { UiAlert } from '../../../shared/ui/atoms/ui-alert/ui-alert';
import { GraficoArea } from '../../../shared/ui/molecules/grafico-area/grafico-area';
import { GraficoBarras } from '../../../shared/ui/molecules/grafico-barras/grafico-barras';
import { GraficoDona } from '../../../shared/ui/molecules/grafico-dona/grafico-dona';
import { KpiTile } from '../../../shared/ui/molecules/kpi-tile/kpi-tile';
import { PageHeader } from '../../../shared/ui/molecules/page-header/page-header';
import { PanelSeccion } from '../../../shared/ui/molecules/panel-seccion/panel-seccion';
import { UsuarioService } from '../../../core/services/usuario.service';
import { CursoService } from '../../../core/services/curso.service';
import { ProgramaService } from '../../../core/services/programa.service';
import { extraerMensajeError } from '../../../core/utils/http-error.util';
import { ItemBarra, SegmentoDona } from '../../../core/utils/graficos.util';
import { formatearFecha } from '../../../core/utils/labels.util';
import {
  COLOR_ROL,
  ResumenCursos,
  ResumenUsuarios,
  TAMANO_MUESTRA_RESUMEN,
  resumirCursos,
  resumirUsuarios,
} from '../../../core/utils/resumen.util';

interface DatosInicioAdmin {
  totalUsuarios: number;
  totalCursos: number;
  totalProgramas: number;
  estudiantesActivos: number;
  estudiantes: number;
  profesores: number;
  usuarios: ResumenUsuarios;
  cursos: ResumenCursos;
  segmentosRoles: SegmentoDona[];
  barrasProgramas: ItemBarra[];
  // true si hay más registros que los que se pidieron: las distribuciones son una muestra.
  parcial: boolean;
}

@Component({
  selector: 'app-admin-inicio-page',
  standalone: true,
  imports: [CommonModule, RouterLink, UiAlert, GraficoArea, GraficoBarras, GraficoDona, KpiTile, PageHeader, PanelSeccion],
  templateUrl: './inicio-page.html',
  styleUrl: './inicio-page.scss',
})
export class AdminInicioPage implements OnInit {
  private readonly usuarioService = inject(UsuarioService);
  private readonly cursoService = inject(CursoService);
  private readonly programaService = inject(ProgramaService);

  readonly datos = signal<DatosInicioAdmin | null>(null);
  readonly cargando = signal(false);
  readonly error = signal('');

  readonly formatearFecha = formatearFecha;

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set('');

    forkJoin({
      usuarios: this.usuarioService.listar({ tamano: TAMANO_MUESTRA_RESUMEN }),
      cursos: this.cursoService.listar({ tamano: TAMANO_MUESTRA_RESUMEN }),
      programas: this.programaService.listar({ tamano: 1 }),
    }).subscribe({
      next: ({ usuarios, cursos, programas }) => {
        const resumenUsuarios = resumirUsuarios(usuarios.contenido, new Date());
        const resumenCursos = resumirCursos(cursos.contenido);
        const estudiantes = resumenUsuarios.porRol.find((r) => r.rol === 'ESTUDIANTE');
        const profesores = resumenUsuarios.porRol.find((r) => r.rol === 'PROFESOR');

        this.datos.set({
          totalUsuarios: usuarios.totalElementos,
          totalCursos: cursos.totalElementos,
          totalProgramas: programas.totalElementos,
          estudiantesActivos: estudiantes?.activos ?? 0,
          estudiantes: estudiantes?.total ?? 0,
          profesores: profesores?.total ?? 0,
          usuarios: resumenUsuarios,
          cursos: resumenCursos,
          segmentosRoles: resumenUsuarios.porRol.map((r) => ({
            etiqueta: r.etiqueta,
            valor: r.total,
            color: COLOR_ROL[r.rol],
          })),
          barrasProgramas: resumenCursos.porPrograma,
          parcial: usuarios.totalElementos > usuarios.contenido.length || cursos.totalElementos > cursos.contenido.length,
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

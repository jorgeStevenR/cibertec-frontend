import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Subject, forkJoin, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { UiAlert } from '../../../shared/ui/atoms/ui-alert/ui-alert';
import { WelcomeBanner } from '../../../shared/ui/molecules/welcome-banner/welcome-banner';
import { BannerCarousel } from '../../../shared/ui/molecules/banner-carousel/banner-carousel';
import { CursoCard } from '../../../shared/ui/molecules/curso-card/curso-card';
import { MiniCalendario } from '../../../shared/ui/molecules/mini-calendario/mini-calendario';
import { Pagination } from '../../../shared/ui/molecules/pagination/pagination';
import { MatriculaService } from '../../../core/services/matricula.service';
import { CursoService } from '../../../core/services/curso.service';
import { ModuloService } from '../../../core/services/modulo.service';
import { EstudianteAvanceService } from '../../../core/services/estudiante-avance.service';
import { AuthService } from '../../../core/services/auth.service';
import { Curso } from '../../../core/models/curso.model';
import { ResumenCurso, Vencimiento } from '../../../core/models/estudiante-avance.model';
import { EventoCalendario } from '../../../core/models/evento-calendario.model';
import { rangoDelMes } from '../../../core/utils/calendario.util';
import { extraerMensajeError } from '../../../core/utils/http-error.util';
import { formatearFecha } from '../../../core/utils/labels.util';

interface CursoMatriculado extends Curso {
  fechaMatricula: string;
  totalModulos: number;
}

interface RangoFechas {
  desde: string;
  hasta: string;
}

const TAMANO_PAGINA = 6;

@Component({
  selector: 'app-estudiante-cursos-page',
  standalone: true,
  imports: [CommonModule, UiAlert, WelcomeBanner, BannerCarousel, CursoCard, MiniCalendario, Pagination],
  templateUrl: './cursos-page.html',
  styleUrl: './cursos-page.scss',
})
export class EstudianteCursosPage implements OnInit {
  private readonly matriculaService = inject(MatriculaService);
  private readonly cursoService = inject(CursoService);
  private readonly moduloService = inject(ModuloService);
  private readonly avanceService = inject(EstudianteAvanceService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly rangoVisible$ = new Subject<RangoFechas>();

  readonly cursos = signal<CursoMatriculado[]>([]);
  readonly cargando = signal(false);
  readonly error = signal('');

  // Avance y vencimientos son datos secundarios: si fallan no tumban el listado de
  // cursos, pero el fallo se expone para no confundirlo con "no hay nada pendiente".
  readonly resumenPorCurso = signal<Record<number, ResumenCurso>>({});
  readonly resumenError = signal(false);
  readonly eventos = signal<EventoCalendario[]>([]);
  readonly vencimientosError = signal(false);

  readonly formatearFecha = formatearFecha;

  readonly pagina = signal(0);
  readonly totalPaginas = computed(() => Math.max(1, Math.ceil(this.cursos().length / TAMANO_PAGINA)));
  readonly cursosPagina = computed(() => {
    const inicio = this.pagina() * TAMANO_PAGINA;
    return this.cursos().slice(inicio, inicio + TAMANO_PAGINA);
  });

  get usuario() {
    return this.auth.usuarioActual();
  }

  constructor() {
    // Cada cambio de mes pide de nuevo los vencimientos de ese rango; switchMap descarta
    // la respuesta de un mes anterior si el usuario navega rápido.
    this.rangoVisible$
      .pipe(
        switchMap((rango) => {
          const usuario = this.auth.usuarioActual();
          if (!usuario) {
            return of(null);
          }
          return this.avanceService.vencimientos(usuario.id, rango.desde, rango.hasta).pipe(
            catchError((err: HttpErrorResponse) => {
              console.error(`Fallo al cargar los vencimientos ${rango.desde} a ${rango.hasta}`, err);
              this.vencimientosError.set(true);
              return of(null);
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((vencimientos) => {
        if (vencimientos) {
          this.vencimientosError.set(false);
          this.eventos.set(vencimientos.map(aEvento));
        }
      });
  }

  ngOnInit(): void {
    this.cargar();
    const hoy = new Date();
    this.cambiarMes(rangoDelMes(hoy.getFullYear(), hoy.getMonth()));
  }

  cambiarMes(rango: RangoFechas): void {
    this.rangoVisible$.next(rango);
  }

  cambiarPagina(pagina: number): void {
    this.pagina.set(pagina);
  }

  abrirParticipantes(curso: CursoMatriculado): void {
    this.router.navigate(['/estudiante', 'cursos', curso.id], { queryParams: { tab: 'participantes' } });
  }

  detalleAvance(cursoId: number): string {
    const resumen = this.resumenPorCurso()[cursoId];
    if (!resumen) {
      return '';
    }
    const total = resumen.totalActividades + resumen.totalCuestionarios;
    if (total === 0) {
      return 'Sin actividades todavía';
    }
    return `${resumen.actividadesEntregadas + resumen.cuestionariosRendidos} de ${total} completadas`;
  }

  cargar(): void {
    const usuario = this.auth.usuarioActual();
    if (!usuario) {
      return;
    }

    this.cargando.set(true);
    this.error.set('');
    this.pagina.set(0);
    this.cargarResumen(usuario.id);

    this.matriculaService.listarPorEstudiante(usuario.id).subscribe({
      next: (matriculas) => {
        if (matriculas.length === 0) {
          this.cursos.set([]);
          this.cargando.set(false);
          return;
        }

        forkJoin(
          matriculas.map((m) =>
            forkJoin({
              curso: this.cursoService.obtener(m.cursoId),
              modulos: this.moduloService.listarPorCurso(m.cursoId),
            }),
          ),
        ).subscribe({
          next: (resultados) => {
            this.cursos.set(
              resultados.map(({ curso, modulos }, i) => ({
                ...curso,
                fechaMatricula: matriculas[i].fechaMatricula,
                totalModulos: modulos.length,
              })),
            );
            this.cargando.set(false);
          },
          error: (err: HttpErrorResponse) => {
            this.cargando.set(false);
            this.error.set(extraerMensajeError(err));
          },
        });
      },
      error: (err: HttpErrorResponse) => {
        this.cargando.set(false);
        this.error.set(extraerMensajeError(err));
      },
    });
  }

  private cargarResumen(estudianteId: number): void {
    this.resumenError.set(false);
    this.resumenPorCurso.set({});
    this.avanceService.resumenCursos(estudianteId).subscribe({
      next: (lista) => {
        this.resumenPorCurso.set(Object.fromEntries(lista.map((r) => [r.cursoId, r])));
      },
      error: (err: HttpErrorResponse) => {
        console.error('Fallo al cargar el avance de los cursos del estudiante', err);
        this.resumenError.set(true);
      },
    });
  }
}

function aEvento(v: Vencimiento): EventoCalendario {
  return { fecha: v.fechaLimite, titulo: v.titulo, curso: v.cursoTitulo, tipo: v.tipo, estado: v.estado };
}

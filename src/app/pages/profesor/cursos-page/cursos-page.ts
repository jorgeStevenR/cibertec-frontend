import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { UiAlert } from '../../../shared/ui/atoms/ui-alert/ui-alert';
import { WelcomeBanner } from '../../../shared/ui/molecules/welcome-banner/welcome-banner';
import { BannerCarousel } from '../../../shared/ui/molecules/banner-carousel/banner-carousel';
import { CursoCard } from '../../../shared/ui/molecules/curso-card/curso-card';
import { Pagination } from '../../../shared/ui/molecules/pagination/pagination';
import { CursoService } from '../../../core/services/curso.service';
import { ModuloService } from '../../../core/services/modulo.service';
import { MatriculaService } from '../../../core/services/matricula.service';
import { AuthService } from '../../../core/services/auth.service';
import { Curso } from '../../../core/models/curso.model';
import { extraerMensajeError } from '../../../core/utils/http-error.util';
import { formatearFecha } from '../../../core/utils/labels.util';

interface CursoConDetalle extends Curso {
  totalModulos: number;
  totalEstudiantes: number;
}

const TAMANO_PAGINA = 6;

@Component({
  selector: 'app-profesor-cursos-page',
  standalone: true,
  imports: [CommonModule, UiAlert, WelcomeBanner, BannerCarousel, CursoCard, Pagination],
  templateUrl: './cursos-page.html',
  styleUrl: './cursos-page.scss',
})
export class ProfesorCursosPage implements OnInit {
  private readonly cursoService = inject(CursoService);
  private readonly moduloService = inject(ModuloService);
  private readonly matriculaService = inject(MatriculaService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly cursos = signal<CursoConDetalle[]>([]);
  readonly cargando = signal(false);
  readonly error = signal('');

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

  ngOnInit(): void {
    this.cargar();
  }

  cambiarPagina(pagina: number): void {
    this.pagina.set(pagina);
  }

  abrirParticipantes(curso: CursoConDetalle): void {
    this.router.navigate(['/profesor', 'cursos', curso.id], { queryParams: { tab: 'participantes' } });
  }

  cargar(): void {
    const usuario = this.auth.usuarioActual();
    if (!usuario) {
      return;
    }

    this.cargando.set(true);
    this.error.set('');
    this.pagina.set(0);
    this.cursoService.listar({ profesorId: usuario.id, tamano: 100 }).subscribe({
      next: (respuesta) => {
        const cursos = respuesta.contenido;
        if (cursos.length === 0) {
          this.cursos.set([]);
          this.cargando.set(false);
          return;
        }

        forkJoin(
          cursos.map((c) =>
            forkJoin({
              modulos: this.moduloService.listarPorCurso(c.id),
              matriculas: this.matriculaService.listarPorCurso(c.id),
            }),
          ),
        ).subscribe({
          next: (resultados) => {
            this.cursos.set(
              cursos.map((curso, i) => ({
                ...curso,
                totalModulos: resultados[i].modulos.length,
                totalEstudiantes: resultados[i].matriculas.length,
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
}

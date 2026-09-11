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
import { MatriculaService } from '../../../core/services/matricula.service';
import { CursoService } from '../../../core/services/curso.service';
import { ModuloService } from '../../../core/services/modulo.service';
import { AuthService } from '../../../core/services/auth.service';
import { Curso } from '../../../core/models/curso.model';
import { extraerMensajeError } from '../../../core/utils/http-error.util';
import { formatearFecha } from '../../../core/utils/labels.util';

interface CursoMatriculado extends Curso {
  fechaMatricula: string;
  totalModulos: number;
}

const TAMANO_PAGINA = 6;

@Component({
  selector: 'app-estudiante-cursos-page',
  standalone: true,
  imports: [CommonModule, UiAlert, WelcomeBanner, BannerCarousel, CursoCard, Pagination],
  templateUrl: './cursos-page.html',
  styleUrl: './cursos-page.scss',
})
export class EstudianteCursosPage implements OnInit {
  private readonly matriculaService = inject(MatriculaService);
  private readonly cursoService = inject(CursoService);
  private readonly moduloService = inject(ModuloService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly cursos = signal<CursoMatriculado[]>([]);
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

  abrirParticipantes(curso: CursoMatriculado): void {
    this.router.navigate(['/estudiante', 'cursos', curso.id], { queryParams: { tab: 'participantes' } });
  }

  cargar(): void {
    const usuario = this.auth.usuarioActual();
    if (!usuario) {
      return;
    }

    this.cargando.set(true);
    this.error.set('');
    this.pagina.set(0);
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
}

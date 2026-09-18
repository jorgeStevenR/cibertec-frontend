import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { UiAlert } from '../../../shared/ui/atoms/ui-alert/ui-alert';
import { UiButton } from '../../../shared/ui/atoms/ui-button/ui-button';
import { DataTable, DataTableColumn } from '../../../shared/ui/organisms/data-table/data-table';
import { LienzoComponent } from '../../../shared/ui/organisms/lienzo/lienzo';
import { CuestionarioResponderComponent } from '../../../shared/ui/organisms/cuestionario-responder/cuestionario-responder';
import { EmbedVideoUrlPipe } from '../../../shared/pipes/embed-video-url.pipe';
import { CursoDatos } from '../../../shared/ui/molecules/curso-datos/curso-datos';
import { CursoService } from '../../../core/services/curso.service';
import { ModuloService } from '../../../core/services/modulo.service';
import { ContenidoService } from '../../../core/services/contenido.service';
import { MatriculaService } from '../../../core/services/matricula.service';
import { ActividadService } from '../../../core/services/actividad.service';
import { EntregaService } from '../../../core/services/entrega.service';
import { BloqueService } from '../../../core/services/bloque.service';
import { CuestionarioService } from '../../../core/services/cuestionario.service';
import { Curso } from '../../../core/models/curso.model';
import { Modulo } from '../../../core/models/modulo.model';
import { Contenido } from '../../../core/models/contenido.model';
import { Matricula } from '../../../core/models/matricula.model';
import { Actividad } from '../../../core/models/actividad.model';
import { Entrega } from '../../../core/models/entrega.model';
import { Bloque } from '../../../core/models/bloque.model';
import { Cuestionario } from '../../../core/models/cuestionario.model';
import { extraerMensajeError } from '../../../core/utils/http-error.util';
import { TIPO_CONTENIDO_LABELS, formatearFecha } from '../../../core/utils/labels.util';

interface ModuloConContenidos {
  modulo: Modulo;
  contenidos: Contenido[];
  actividades: Actividad[];
  bloques: Bloque[];
  cuestionarios: Cuestionario[];
  cuestionariosError: boolean;
}

type Tab = 'curso' | 'participantes';

@Component({
  selector: 'app-estudiante-curso-detalle-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    CursoDatos,
    UiAlert,
    UiButton,
    DataTable,
    LienzoComponent,
    CuestionarioResponderComponent,
    EmbedVideoUrlPipe,
  ],
  templateUrl: './curso-detalle-page.html',
  styleUrl: './curso-detalle-page.scss',
})
export class EstudianteCursoDetallePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly cursoService = inject(CursoService);
  private readonly moduloService = inject(ModuloService);
  private readonly contenidoService = inject(ContenidoService);
  private readonly matriculaService = inject(MatriculaService);
  private readonly actividadService = inject(ActividadService);
  private readonly entregaService = inject(EntregaService);
  private readonly bloqueService = inject(BloqueService);
  private readonly cuestionarioService = inject(CuestionarioService);

  readonly cursoId = Number(this.route.snapshot.paramMap.get('cursoId'));

  readonly curso = signal<Curso | null>(null);
  readonly modulos = signal<ModuloConContenidos[]>([]);
  readonly cargando = signal(false);
  readonly error = signal('');

  readonly tipoLabels = TIPO_CONTENIDO_LABELS;
  readonly formatearFecha = formatearFecha;

  readonly tabActiva = signal<Tab>('curso');
  readonly participantes = signal<Matricula[]>([]);
  readonly cargandoParticipantes = signal(false);
  private participantesCargados = false;

  readonly participantesColumnas: DataTableColumn<Matricula>[] = [
    { key: 'nombre', label: 'Nombre', format: (m) => m.estudianteNombre || `Estudiante #${m.estudianteId}` },
    { key: 'email', label: 'Correo', format: (m) => m.estudianteEmail ?? '—' },
    { key: 'fecha', label: 'Matriculado', format: (m) => formatearFecha(m.fechaMatricula) },
  ];

  // actividadId -> mi entrega (o null si todavía no entrego)
  readonly misEntregas = signal<Record<number, Entrega | null>>({});
  readonly archivosSeleccionados = signal<Record<number, File | null>>({});
  readonly entregando = signal<Record<number, boolean>>({});

  readonly personajeImagenUrls = signal<Record<number, string>>({});
  readonly personajeFraseIndice = signal<Record<number, number>>({});

  readonly lienzoAbierto = signal<{ moduloId: number; titulo: string } | null>(null);

  abrirLienzo(moduloId: number, titulo: string): void {
    this.lienzoAbierto.set({ moduloId, titulo });
  }

  cerrarLienzo(): void {
    this.lienzoAbierto.set(null);
  }

  readonly cuestionarioAbierto = signal<{ id: number; titulo: string } | null>(null);

  abrirCuestionario(cuestionario: Cuestionario): void {
    this.cuestionarioAbierto.set({ id: cuestionario.id, titulo: cuestionario.titulo });
  }

  cerrarCuestionario(): void {
    this.cuestionarioAbierto.set(null);
  }

  ngOnInit(): void {
    this.cargar();
    if (this.route.snapshot.queryParamMap.get('tab') === 'participantes') {
      this.seleccionarTab('participantes');
    }
  }

  seleccionarTab(tab: Tab): void {
    this.tabActiva.set(tab);
    if (tab === 'participantes' && !this.participantesCargados) {
      this.cargarParticipantes();
    }
  }

  private cargarParticipantes(): void {
    this.cargandoParticipantes.set(true);
    this.error.set('');
    this.matriculaService.listarPorCurso(this.cursoId).subscribe({
      next: (lista) => {
        this.participantes.set(lista);
        this.participantesCargados = true;
        this.cargandoParticipantes.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.cargandoParticipantes.set(false);
        this.error.set(extraerMensajeError(err));
      },
    });
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set('');

    forkJoin({
      curso: this.cursoService.obtener(this.cursoId),
      modulos: this.moduloService.listarPorCurso(this.cursoId),
    }).subscribe({
      next: ({ curso, modulos }) => {
        this.curso.set(curso);
        const ordenados = [...modulos].sort((a, b) => a.orden - b.orden);

        if (ordenados.length === 0) {
          this.modulos.set([]);
          this.cargando.set(false);
          return;
        }

        forkJoin(
          ordenados.map((m) =>
            forkJoin({
              contenidos: this.contenidoService.listarPorModulo(m.id),
              actividades: this.actividadService.listarPorModulo(m.id),
              bloques: this.bloqueService.listarPorModulo(m.id),
              // Si el backend de cuestionarios falla, no debe tumbar el resto del
              // módulo (bloques/actividades/contenidos siguen funcionando bien),
              // pero el fallo se marca explícitamente para no confundirlo con
              // "este módulo no tiene cuestionarios".
              cuestionarios: this.cuestionarioService.listarPorModulo(m.id).pipe(
                map((items) => ({ items, fallo: false })),
                catchError((err: HttpErrorResponse) => {
                  console.error(`Fallo al cargar cuestionarios del módulo ${m.id}`, err);
                  return of({ items: [] as Cuestionario[], fallo: true });
                }),
              ),
            }),
          ),
        ).subscribe({
          next: (resultados) => {
            const modulosConDatos = ordenados.map((modulo, i) => ({
              modulo,
              // Los estudiantes solo deben ver contenidos marcados como visibles;
              // el backend no filtra esto, asi que lo hacemos aca.
              contenidos: resultados[i].contenidos.filter((c) => c.visible),
              actividades: resultados[i].actividades,
              bloques: resultados[i].bloques,
              cuestionarios: resultados[i].cuestionarios.items,
              cuestionariosError: resultados[i].cuestionarios.fallo,
            }));
            this.modulos.set(modulosConDatos);
            this.cargarMisEntregas(modulosConDatos);
            const personajes = modulosConDatos.flatMap((m) => m.bloques.filter((b) => b.tipo === 'PERSONAJE'));
            this.cargarImagenesPersonaje(personajes);
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

  private cargarMisEntregas(modulos: ModuloConContenidos[]): void {
    const actividadIds = modulos.flatMap((m) => m.actividades.map((a) => a.id));
    if (actividadIds.length === 0) {
      this.cargando.set(false);
      return;
    }

    forkJoin(actividadIds.map((id) => this.entregaService.obtenerMiEntrega(id))).subscribe({
      next: (entregas) => {
        const mapa: Record<number, Entrega | null> = {};
        actividadIds.forEach((id, i) => (mapa[id] = entregas[i]));
        this.misEntregas.set(mapa);
        this.cargando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.cargando.set(false);
        this.error.set(extraerMensajeError(err));
      },
    });
  }

  ver(contenido: Contenido): void {
    this.error.set('');
    this.contenidoService.obtenerUrl(contenido.id).subscribe({
      next: (respuesta) => window.open(respuesta.url, '_blank', 'noopener'),
      error: (err: HttpErrorResponse) => this.error.set(extraerMensajeError(err)),
    });
  }

  onArchivoSeleccionado(evento: Event, actividadId: number): void {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0] ?? null;
    this.archivosSeleccionados.set({ ...this.archivosSeleccionados(), [actividadId]: archivo });
  }

  entregar(actividadId: number): void {
    const archivo = this.archivosSeleccionados()[actividadId];
    if (!archivo) {
      this.error.set('Selecciona un archivo antes de entregar.');
      return;
    }

    this.entregando.set({ ...this.entregando(), [actividadId]: true });
    this.error.set('');

    this.entregaService.entregar(actividadId, archivo).subscribe({
      next: (entrega) => {
        this.entregando.set({ ...this.entregando(), [actividadId]: false });
        this.misEntregas.set({ ...this.misEntregas(), [actividadId]: entrega });
      },
      error: (err: HttpErrorResponse) => {
        this.entregando.set({ ...this.entregando(), [actividadId]: false });
        this.error.set(extraerMensajeError(err));
      },
    });
  }

  verMiEntrega(entrega: Entrega): void {
    this.error.set('');
    this.entregaService.obtenerUrl(entrega.id).subscribe({
      next: (respuesta) => window.open(respuesta.url, '_blank', 'noopener'),
      error: (err: HttpErrorResponse) => this.error.set(extraerMensajeError(err)),
    });
  }

  verBloque(bloque: Bloque): void {
    this.error.set('');
    this.bloqueService.obtenerUrl(bloque.id).subscribe({
      next: (respuesta) => window.open(respuesta.url, '_blank', 'noopener'),
      error: (err: HttpErrorResponse) => this.error.set(extraerMensajeError(err)),
    });
  }

  private cargarImagenesPersonaje(bloques: Bloque[]): void {
    for (const bloque of bloques) {
      this.bloqueService.obtenerUrl(bloque.id).subscribe({
        next: (respuesta) => {
          this.personajeImagenUrls.set({ ...this.personajeImagenUrls(), [bloque.id]: respuesta.url });
        },
      });
    }
  }

  frasesPersonaje(bloque: Bloque): string[] {
    return (bloque.texto ?? '')
      .split('\n')
      .map((f) => f.trim())
      .filter((f) => f.length > 0);
  }

  fraseActualPersonaje(bloque: Bloque): string {
    const frases = this.frasesPersonaje(bloque);
    if (frases.length === 0) {
      return '';
    }
    const indice = this.personajeFraseIndice()[bloque.id] ?? 0;
    return frases[Math.min(indice, frases.length - 1)];
  }

  siguienteFrasePersonaje(bloque: Bloque): void {
    const frases = this.frasesPersonaje(bloque);
    const actual = this.personajeFraseIndice()[bloque.id] ?? 0;
    const siguiente = actual + 1 >= frases.length ? 0 : actual + 1;
    this.personajeFraseIndice.set({ ...this.personajeFraseIndice(), [bloque.id]: siguiente });
  }

}

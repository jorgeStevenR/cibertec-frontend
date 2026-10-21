import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, Directive, computed, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { UiAlert } from '../../../shared/ui/atoms/ui-alert/ui-alert';
import { UiButton } from '../../../shared/ui/atoms/ui-button/ui-button';
import { DataTable, DataTableColumn } from '../../../shared/ui/organisms/data-table/data-table';
import { LienzoComponent } from '../../../shared/ui/organisms/lienzo/lienzo';
import { CuestionarioResponderComponent } from '../../../shared/ui/organisms/cuestionario-responder/cuestionario-responder';
import { BloqueVista } from '../../../shared/ui/molecules/bloque-vista/bloque-vista';
import { ModuloPestanas, RamaPestanas } from '../../../shared/ui/organisms/modulo-pestanas/modulo-pestanas';
import { CursoPresentacion } from '../../../shared/ui/molecules/curso-presentacion/curso-presentacion';
import { CursoService } from '../../../core/services/curso.service';
import { ModuloService } from '../../../core/services/modulo.service';
import { ContenidoService } from '../../../core/services/contenido.service';
import { MatriculaService } from '../../../core/services/matricula.service';
import { ActividadService } from '../../../core/services/actividad.service';
import { EntregaService } from '../../../core/services/entrega.service';
import { BloqueService } from '../../../core/services/bloque.service';
import { CuestionarioService } from '../../../core/services/cuestionario.service';
import { LienzoService } from '../../../core/services/lienzo.service';
import { PaginaModuloService } from '../../../core/services/pagina-modulo.service';
import { Curso } from '../../../core/models/curso.model';
import { Modulo } from '../../../core/models/modulo.model';
import { Contenido } from '../../../core/models/contenido.model';
import { Matricula } from '../../../core/models/matricula.model';
import { Actividad } from '../../../core/models/actividad.model';
import { Entrega } from '../../../core/models/entrega.model';
import { Bloque } from '../../../core/models/bloque.model';
import { Cuestionario, IntentoDetalle } from '../../../core/models/cuestionario.model';
import { LienzoResumen } from '../../../core/models/lienzo.model';
import { PaginaModulo } from '../../../core/models/pagina-modulo.model';
import { extraerMensajeError } from '../../../core/utils/http-error.util';
import { aplanarArbol, armarArbolModulos } from '../../../core/utils/modulo-arbol.util';
import { TIPO_CONTENIDO_LABELS, formatearFecha, formatearNotaSobre5, formatearPuntaje } from '../../../core/utils/labels.util';
import {
  EstadoCuestionarioEstudiante,
  estadoCuestionarioEstudiante,
} from '../../../core/utils/cuestionario.util';

interface ModuloConContenidos {
  modulo: Modulo;
  contenidos: Contenido[];
  actividades: Actividad[];
  bloques: Bloque[];
  cuestionarios: Cuestionario[];
  cuestionariosError: boolean;
  paginas: PaginaModulo[];
  paginasError: boolean;
  // Hojas del lienzo (diseño libre); no confundir con las páginas del módulo.
  hojas: LienzoResumen[];
}

type Tab = 'curso' | 'participantes';

interface ContextoNavModulo {
  $implicit: ModuloConContenidos;
  esHijo: boolean;
}

// Da tipo al contexto del ng-template de la navegación (sin esto, 'item' sería any).
@Directive({ selector: 'ng-template[navModulo]', standalone: true })
export class NavModuloEstudianteTemplate {
  static ngTemplateContextGuard(_dir: NavModuloEstudianteTemplate, ctx: unknown): ctx is ContextoNavModulo {
    return true;
  }
}

@Component({
  selector: 'app-estudiante-curso-detalle-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    CursoPresentacion,
    UiAlert,
    UiButton,
    DataTable,
    LienzoComponent,
    CuestionarioResponderComponent,
    BloqueVista,
    ModuloPestanas,
    NavModuloEstudianteTemplate,
  ],
  templateUrl: './curso-detalle-page.html',
  styleUrl: './curso-detalle-page.scss',
})
export class EstudianteCursoDetallePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cursoService = inject(CursoService);
  private readonly moduloService = inject(ModuloService);
  private readonly contenidoService = inject(ContenidoService);
  private readonly matriculaService = inject(MatriculaService);
  private readonly actividadService = inject(ActividadService);
  private readonly entregaService = inject(EntregaService);
  private readonly bloqueService = inject(BloqueService);
  private readonly cuestionarioService = inject(CuestionarioService);
  private readonly lienzoService = inject(LienzoService);
  private readonly paginaModuloService = inject(PaginaModuloService);

  readonly cursoId = Number(this.route.snapshot.paramMap.get('cursoId'));

  readonly curso = signal<Curso | null>(null);
  readonly modulos = signal<ModuloConContenidos[]>([]);
  readonly cargando = signal(false);
  readonly error = signal('');

  readonly tipoLabels = TIPO_CONTENIDO_LABELS;
  readonly formatearFecha = formatearFecha;
  readonly formatearNotaSobre5 = formatearNotaSobre5;
  readonly formatearPuntaje = formatearPuntaje;

  readonly tabActiva = signal<Tab>('curso');
  readonly participantes = signal<Matricula[]>([]);
  readonly cargandoParticipantes = signal(false);
  private participantesCargados = false;

  readonly navAbierta = signal(true);
  readonly modulosColapsados = signal<Set<number>>(new Set());

  toggleNav(): void {
    this.navAbierta.update((valor) => !valor);
  }

  toggleModuloNav(moduloId: number): void {
    const colapsados = new Set(this.modulosColapsados());
    if (colapsados.has(moduloId)) {
      colapsados.delete(moduloId);
    } else {
      colapsados.add(moduloId);
    }
    this.modulosColapsados.set(colapsados);
  }

  moduloColapsado(moduloId: number): boolean {
    return this.modulosColapsados().has(moduloId);
  }

  readonly participantesColumnas: DataTableColumn<Matricula>[] = [
    { key: 'nombre', label: 'Nombre', format: (m) => m.estudianteNombre || `Estudiante #${m.estudianteId}` },
    { key: 'email', label: 'Correo', format: (m) => m.estudianteEmail ?? '—' },
    { key: 'fecha', label: 'Matriculado', format: (m) => formatearFecha(m.fechaMatricula) },
  ];

  // actividadId -> mi entrega (o null si todavía no entrego)
  readonly misEntregas = signal<Record<number, Entrega | null>>({});
  readonly archivosSeleccionados = signal<Record<number, File | null>>({});
  readonly entregando = signal<Record<number, boolean>>({});

  readonly lienzoAbierto = signal<{ moduloId: number; titulo: string; paginaInicialId: number | null } | null>(null);

  abrirLienzo(moduloId: number, titulo: string): void {
    this.lienzoAbierto.set({ moduloId, titulo, paginaInicialId: null });
  }

  abrirHoja(moduloId: number, hojaId: number, tituloModulo: string): void {
    this.lienzoAbierto.set({ moduloId, titulo: tituloModulo, paginaInicialId: hojaId });
  }

  cerrarLienzo(): void {
    this.lienzoAbierto.set(null);
  }

  readonly cuestionarioAbierto = signal<{ id: number; titulo: string } | null>(null);

  // cuestionarioId -> mi intento (null = no respondí). Una clave ausente
  // significa "no se pudo consultar" y la lista no muestra estado.
  readonly misIntentos = signal<Record<number, IntentoDetalle | null>>({});

  abrirCuestionario(cuestionario: Cuestionario): void {
    this.cuestionarioAbierto.set({ id: cuestionario.id, titulo: cuestionario.titulo });
  }

  // --- Pestañas de módulos (como Moodle): se muestra un módulo a la vez ---

  readonly moduloSeleccionadoId = signal<number | null>(null);

  readonly arbol = computed(() => {
    const items = this.modulos();
    const porId = new Map(items.map((i) => [i.modulo.id, i]));
    return armarArbolModulos(items.map((i) => i.modulo)).map((rama) => ({
      item: porId.get(rama.modulo.id)!,
      hijos: rama.hijos.map((h) => porId.get(h.id)!),
    }));
  });

  readonly ramasPestanas = computed<RamaPestanas[]>(() =>
    this.arbol().map((rama) => ({
      id: rama.item.modulo.id,
      titulo: rama.item.modulo.titulo,
      tieneContenidoPropio: !this.moduloVacio(rama.item),
      hijos: rama.hijos.map((h) => ({ id: h.modulo.id, titulo: h.modulo.titulo })),
    })),
  );

  readonly moduloVisible = computed(() => this.modulos().find((i) => i.modulo.id === this.moduloSeleccionadoId()) ?? null);

  // La presentación del curso (profesor, datos) va en la primera pestaña, como "General" en Moodle.
  readonly enPrimeraPestana = computed(() => {
    const primera = this.arbol()[0];
    const visible = this.moduloVisible();
    return !!primera && !!visible && (visible.modulo.id === primera.item.modulo.id || visible.modulo.moduloPadreId === primera.item.modulo.id);
  });

  seleccionarModulo(moduloId: number): void {
    this.moduloSeleccionadoId.set(moduloId);
    // El fragmento en la URL permite volver a esta misma pestaña (ej. desde una página).
    this.router.navigate([], { relativeTo: this.route, fragment: `modulo-${moduloId}`, replaceUrl: true, queryParamsHandling: 'preserve' });
  }

  // Primera vez: la pestaña del fragmento (#modulo-X) si existe; si no, la primera.
  private inicializarPestana(): void {
    const fragmento = this.route.snapshot.fragment ?? '';
    const pedido = Number(fragmento.replace('modulo-', ''));
    if (pedido && this.modulos().some((i) => i.modulo.id === pedido)) {
      this.moduloSeleccionadoId.set(pedido);
      return;
    }
    const primera = this.ramasPestanas()[0];
    if (primera) {
      this.moduloSeleccionadoId.set(!primera.tieneContenidoPropio && primera.hijos.length > 0 ? primera.hijos[0].id : primera.id);
    }
  }

  moduloVacio(item: ModuloConContenidos): boolean {
    return (
      item.bloques.length === 0 &&
      item.contenidos.length === 0 &&
      item.actividades.length === 0 &&
      item.cuestionarios.length === 0 &&
      !item.cuestionariosError &&
      item.paginas.length === 0 &&
      !item.paginasError &&
      item.hojas.length === 0
    );
  }

  cerrarCuestionario(): void {
    this.cuestionarioAbierto.set(null);
  }

  onCuestionarioRespondido(intento: IntentoDetalle): void {
    this.misIntentos.update((mapa) => ({ ...mapa, [intento.cuestionarioId]: intento }));
  }

  estadoCuestionario(cuestionario: Cuestionario): EstadoCuestionarioEstudiante {
    return estadoCuestionarioEstudiante(cuestionario, this.misIntentos()[cuestionario.id]);
  }

  // No crítico: si falla la consulta de un intento, ese cuestionario se lista
  // sin chip de estado, pero se puede abrir igual (el overlay vuelve a consultar).
  private cargarMisIntentos(modulos: ModuloConContenidos[]): void {
    const ids = modulos.flatMap((m) => m.cuestionarios.map((c) => c.id));
    if (ids.length === 0) {
      return;
    }
    forkJoin(
      ids.map((id) =>
        this.cuestionarioService.obtenerMiIntento(id).pipe(
          catchError((err: HttpErrorResponse) => {
            console.error(`No se pudo consultar mi intento del cuestionario ${id}`, err);
            return of(undefined);
          }),
        ),
      ),
    ).subscribe({
      next: (intentos) => {
        const mapa: Record<number, IntentoDetalle | null> = {};
        ids.forEach((id, i) => {
          const intento = intentos[i];
          if (intento !== undefined) {
            mapa[id] = intento;
          }
        });
        this.misIntentos.set(mapa);
      },
      error: (err: HttpErrorResponse) => console.error('No se pudieron consultar mis intentos', err),
    });
  }

  ngOnInit(): void {
    this.cargar();
    if (this.route.snapshot.queryParamMap.get('tab') === 'participantes') {
      this.seleccionarTab('participantes');
    }
    this.registrarAcceso();
  }

  // Telemetría: no debe bloquear la navegación ni mostrar error al estudiante si falla.
  private registrarAcceso(): void {
    this.matriculaService.registrarAcceso(this.cursoId).subscribe({
      next: () => {},
      error: (err: HttpErrorResponse) => console.error('No se pudo registrar el acceso al curso', err),
    });
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
        // Orden de lectura: cada módulo seguido de sus submódulos (el orden es relativo entre hermanos).
        const ordenados = aplanarArbol(armarArbolModulos(modulos));

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
              // Mismo criterio que cuestionarios: no tumba el módulo, pero el fallo se ve.
              paginas: this.paginaModuloService.listarPorModulo(m.id).pipe(
                map((items) => ({ items, fallo: false })),
                catchError((err: HttpErrorResponse) => {
                  console.error(`Fallo al cargar las páginas del módulo ${m.id}`, err);
                  return of({ items: [] as PaginaModulo[], fallo: true });
                }),
              ),
              // No crítico: si falla, el módulo se ve igual sin las hojas del lienzo en la navegación.
              hojas: this.lienzoService.listar(m.id).pipe(catchError(() => of([] as LienzoResumen[]))),
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
              paginas: resultados[i].paginas.items,
              paginasError: resultados[i].paginas.fallo,
              hojas: resultados[i].hojas,
            }));
            this.modulos.set(modulosConDatos);
            this.inicializarPestana();
            this.cargarMisEntregas(modulosConDatos);
            this.cargarMisIntentos(modulosConDatos);
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

}

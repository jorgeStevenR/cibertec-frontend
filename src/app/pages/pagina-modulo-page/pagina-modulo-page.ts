import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, of, switchMap, catchError, map } from 'rxjs';
import { UiAlert } from '../../shared/ui/atoms/ui-alert/ui-alert';
import { UiButton } from '../../shared/ui/atoms/ui-button/ui-button';
import { FormField } from '../../shared/ui/molecules/form-field/form-field';
import { BloqueVista } from '../../shared/ui/molecules/bloque-vista/bloque-vista';
import { BloquesEditor } from '../../shared/ui/organisms/bloques-editor/bloques-editor';
import { ConfirmDialog } from '../../shared/ui/organisms/confirm-dialog/confirm-dialog';
import { PaginaModuloService } from '../../core/services/pagina-modulo.service';
import { BloqueService } from '../../core/services/bloque.service';
import { ModuloService } from '../../core/services/modulo.service';
import { Bloque, ContenedorBloques } from '../../core/models/bloque.model';
import { Modulo } from '../../core/models/modulo.model';
import { PAGINA_MODULO_TITULO_MAX, PaginaModulo } from '../../core/models/pagina-modulo.model';
import { extraerErroresPorCampo, extraerMensajeError } from '../../core/utils/http-error.util';
import { vecinos } from '../../core/utils/orden.util';

/** Rol desde el que se abre la página: lo define la ruta (`data.panel`). */
type Panel = 'profesor' | 'estudiante' | 'admin';

/**
 * Vista de una Página de un módulo, compartida por los tres paneles: el
 * profesor dueño la edita; estudiante y admin la ven en solo lectura.
 */
@Component({
  selector: 'app-pagina-modulo-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, UiAlert, UiButton, FormField, BloqueVista, BloquesEditor, ConfirmDialog],
  templateUrl: './pagina-modulo-page.html',
  styleUrl: './pagina-modulo-page.scss',
})
export class PaginaModuloPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly paginaModuloService = inject(PaginaModuloService);
  private readonly bloqueService = inject(BloqueService);
  private readonly moduloService = inject(ModuloService);

  readonly panel = (this.route.snapshot.data['panel'] ?? 'estudiante') as Panel;
  readonly editable = this.panel === 'profesor';
  readonly cursoId = Number(this.route.snapshot.paramMap.get('cursoId'));

  readonly pagina = signal<PaginaModulo | null>(null);
  readonly modulo = signal<Modulo | null>(null);
  readonly bloques = signal<Bloque[]>([]);
  // Páginas del mismo módulo, para "anterior / siguiente". No crítico.
  readonly hermanas = signal<PaginaModulo[]>([]);
  readonly cargando = signal(false);
  readonly error = signal('');

  readonly contenedor = computed<ContenedorBloques | null>(() => {
    const p = this.pagina();
    return p ? { tipo: 'pagina', id: p.id } : null;
  });

  readonly navegacion = computed(() => {
    const p = this.pagina();
    return p ? vecinos(this.hermanas(), p.id) : { anterior: null, siguiente: null };
  });

  readonly posicion = computed(() => {
    const p = this.pagina();
    const i = p ? this.hermanas().findIndex((h) => h.id === p.id) : -1;
    return i === -1 ? null : { actual: i + 1, total: this.hermanas().length };
  });

  // --- Renombrar / eliminar (solo profesor) ---
  readonly renombrando = signal(false);
  readonly guardandoTitulo = signal(false);
  readonly errorTitulo = signal('');
  readonly tituloMax = PAGINA_MODULO_TITULO_MAX;
  readonly tituloForm = this.fb.nonNullable.group({
    titulo: ['', [Validators.required, Validators.maxLength(PAGINA_MODULO_TITULO_MAX), Validators.pattern(/\S/)]],
  });

  readonly confirmEliminarAbierto = signal(false);
  readonly eliminando = signal(false);

  constructor() {
    // Anterior/siguiente navegan dentro de la misma ruta: el componente se
    // reutiliza, así que la carga sigue al parámetro y no solo al snapshot.
    this.route.paramMap
      .pipe(
        map((params) => Number(params.get('paginaId'))),
        switchMap((paginaId) => {
          this.cargando.set(true);
          this.error.set('');
          this.renombrando.set(false);
          return this.paginaModuloService.obtener(paginaId).pipe(
            switchMap((pagina) =>
              forkJoin({
                bloques: this.bloqueService.listar({ tipo: 'pagina', id: pagina.id }),
                hermanas: this.paginaModuloService.listarPorModulo(pagina.moduloId).pipe(
                  catchError((err: HttpErrorResponse) => {
                    console.error(`No se pudieron cargar las páginas del módulo ${pagina.moduloId}`, err);
                    return of([] as PaginaModulo[]);
                  }),
                ),
                modulo: this.moduloService.obtener(pagina.moduloId).pipe(
                  catchError((err: HttpErrorResponse) => {
                    console.error(`No se pudo cargar el módulo ${pagina.moduloId}`, err);
                    return of(null);
                  }),
                ),
              }).pipe(map((resto) => ({ pagina, ...resto }))),
            ),
            map((datos) => ({ ok: true as const, datos })),
            catchError((err: HttpErrorResponse) => of({ ok: false as const, err })),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((resultado) => {
        this.cargando.set(false);
        if (!resultado.ok) {
          this.pagina.set(null);
          this.error.set(
            resultado.err.status === 404
              ? 'Esta página ya no existe (puede que la hayan eliminado).'
              : extraerMensajeError(resultado.err),
          );
          return;
        }
        const { pagina, bloques, hermanas, modulo } = resultado.datos;
        this.pagina.set(pagina);
        this.bloques.set(bloques);
        this.hermanas.set(hermanas);
        this.modulo.set(modulo);
      });
  }

  /** Enlace para volver al módulo desde cada panel. */
  volverLink(): unknown[] {
    const moduloId = this.pagina()?.moduloId ?? this.route.snapshot.paramMap.get('moduloId');
    switch (this.panel) {
      case 'profesor':
        return ['/profesor/cursos', this.cursoId];
      case 'admin':
        return moduloId ? ['/admin/cursos', this.cursoId, 'modulos', moduloId] : ['/admin/cursos', this.cursoId];
      default:
        return ['/estudiante/cursos', this.cursoId];
    }
  }

  // El detalle del curso de profesor/estudiante tiene un ancla por módulo.
  volverFragmento(): string | undefined {
    const moduloId = this.pagina()?.moduloId;
    return this.panel !== 'admin' && moduloId ? `modulo-${moduloId}` : undefined;
  }

  paginaLink(pagina: PaginaModulo): unknown[] {
    switch (this.panel) {
      case 'profesor':
        return ['/profesor/cursos', this.cursoId, 'paginas', pagina.id];
      case 'admin':
        return ['/admin/cursos', this.cursoId, 'modulos', pagina.moduloId, 'paginas', pagina.id];
      default:
        return ['/estudiante/cursos', this.cursoId, 'paginas', pagina.id];
    }
  }

  // --- Renombrar ---

  abrirRenombrar(): void {
    this.tituloForm.reset({ titulo: this.pagina()?.titulo ?? '' });
    this.errorTitulo.set('');
    this.renombrando.set(true);
  }

  cancelarRenombrar(): void {
    this.renombrando.set(false);
  }

  guardarTitulo(): void {
    const pagina = this.pagina();
    if (!pagina) {
      return;
    }
    if (this.tituloForm.invalid) {
      this.tituloForm.markAllAsTouched();
      return;
    }
    this.guardandoTitulo.set(true);
    this.errorTitulo.set('');
    this.paginaModuloService.actualizar(pagina.id, { titulo: this.tituloForm.getRawValue().titulo.trim() }).subscribe({
      next: (actualizada) => {
        this.guardandoTitulo.set(false);
        this.renombrando.set(false);
        this.pagina.set(actualizada);
        this.hermanas.update((lista) => lista.map((p) => (p.id === actualizada.id ? actualizada : p)));
      },
      error: (err: HttpErrorResponse) => {
        this.guardandoTitulo.set(false);
        this.errorTitulo.set(extraerErroresPorCampo(err)?.['titulo'] ?? extraerMensajeError(err));
      },
    });
  }

  // --- Eliminar ---

  confirmarEliminar(): void {
    const pagina = this.pagina();
    if (!pagina) {
      return;
    }
    this.eliminando.set(true);
    this.paginaModuloService.eliminar(pagina.id).subscribe({
      next: () => {
        this.eliminando.set(false);
        this.confirmEliminarAbierto.set(false);
        this.router.navigate(this.volverLink(), { fragment: this.volverFragmento() });
      },
      error: (err: HttpErrorResponse) => {
        this.eliminando.set(false);
        this.confirmEliminarAbierto.set(false);
        this.error.set(extraerMensajeError(err));
      },
    });
  }
}

/**
 * Recurso "Página" de un módulo (como la Página de Moodle): un título y
 * bloques apilados (ver BloqueService con contenedor 'pagina').
 * No confundir con PaginaResponse (paginación de listados, pagina.model.ts).
 */
export interface PaginaModulo {
  id: number;
  moduloId: number;
  titulo: string;
  // Empieza en 1; el backend ya devuelve las páginas ordenadas.
  orden: number;
  // ISO sin zona horaria y con decimales variables (ej. "2026-09-30T15:43:55.654").
  fechaCreacion: string;
}

export interface PaginaModuloRequest {
  titulo: string;
}

export const PAGINA_MODULO_TITULO_MAX = 150;

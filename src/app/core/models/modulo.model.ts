export interface Modulo {
  id: number;
  cursoId: number;
  titulo: string;
  // Relativo entre hermanos (mismo padre, o raíces entre sí).
  orden: number;
  // null = módulo raíz. Un solo nivel: un submódulo nunca tiene hijos propios.
  moduloPadreId: number | null;
}

export interface ModuloRequest {
  titulo: string;
  orden: number;
  // Mandarlo SIEMPRE en el PUT: omitido o null mueve el módulo a la raíz.
  moduloPadreId: number | null;
}

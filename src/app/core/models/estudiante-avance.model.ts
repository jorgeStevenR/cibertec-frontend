export type TipoItem = 'ACTIVIDAD' | 'CUESTIONARIO';
export type EstadoVencimiento = 'PENDIENTE' | 'ENTREGADA' | 'RENDIDO' | 'VENCIDA';
export type EstadoCalificacion = 'SIN_ENTREGAR' | 'ENTREGADA' | 'CALIFICADA' | 'RENDIDO';

export interface ResumenCurso {
  cursoId: number;
  // Fechas de calendario "yyyy-MM-dd" del curso; null si el curso no las tiene.
  fechaInicio: string | null;
  fechaFin: string | null;
  totalActividades: number;
  actividadesEntregadas: number;
  actividadesPendientes: number;
  totalCuestionarios: number;
  cuestionariosRendidos: number;
  cuestionariosPendientes: number;
  // Viene calculado por el backend (0-100); no se recalcula en el frontend.
  porcentajeCompletado: number;
}

export interface Vencimiento {
  tipo: TipoItem;
  id: number;
  titulo: string;
  cursoId: number;
  cursoTitulo: string;
  moduloId: number;
  fechaLimite: string;
  estado: EstadoVencimiento;
}

export interface CalificacionItem {
  tipo: TipoItem;
  id: number;
  titulo: string;
  moduloId: number;
  moduloTitulo: string;
  puntajeMaximo: number;
  // null si no está calificada o si es un cuestionario con la nota oculta por el profesor.
  nota: number | null;
  notaSobre5: number | null;
  estado: EstadoCalificacion;
  fechaEntrega: string | null;
  fechaCalificacion: string | null;
  comentarioDocente: string | null;
}

export interface CalificacionesCurso {
  cursoId: number;
  cursoTitulo: string;
  fechaInicio: string | null;
  fechaFin: string | null;
  // Suman solo los ítems ya calificados (y no los cuestionarios con la nota oculta):
  // un curso sin nada calificado llega como 0 / 0.
  puntajeObtenido: number;
  puntajeMaximoCalificado: number;
  // Total del curso en escala 0,0–5,0; null si todavía no hay nada calificado.
  notaSobre5: number | null;
  items: CalificacionItem[];
}

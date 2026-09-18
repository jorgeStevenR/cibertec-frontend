import { Rol } from '../models/usuario.model';
import { TipoContenido } from '../models/contenido.model';
import { EstadoCalificacion, TipoItem } from '../models/estudiante-avance.model';

export const ROL_LABELS: Record<Rol, string> = {
  ADMINISTRADOR: 'Administrador',
  GESTOR_USUARIOS: 'Gestor de usuarios',
  PROFESOR: 'Profesor',
  ESTUDIANTE: 'Estudiante',
};

export const TIPO_CONTENIDO_LABELS: Record<TipoContenido, string> = {
  VIDEO: 'Video',
  PDF: 'PDF',
  DOCUMENTO: 'Documento',
  ENLACE: 'Enlace',
};

export const TIPO_ITEM_LABELS: Record<TipoItem, string> = {
  ACTIVIDAD: 'Actividad',
  CUESTIONARIO: 'Cuestionario',
};

export const ESTADO_CALIFICACION_LABELS: Record<EstadoCalificacion, string> = {
  SIN_ENTREGAR: 'Sin entregar',
  ENTREGADA: 'Entregada',
  CALIFICADA: 'Calificada',
  RENDIDO: 'Rendido',
};

// 18 -> "18", 17.5 -> "17.5", 17.25 -> "17.3" (una cifra decimal como máximo).
export function formatearPuntaje(valor: number): string {
  return Number.isInteger(valor) ? String(valor) : valor.toFixed(1);
}

// Porcentaje entero de lo obtenido sobre lo calificado; null si todavía no hay nada calificado.
export function porcentajePuntaje(obtenido: number, maximoCalificado: number): number | null {
  if (maximoCalificado <= 0) {
    return null;
  }
  return Math.round((obtenido / maximoCalificado) * 100);
}

export function formatearFecha(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) {
    return iso;
  }
  return fecha.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

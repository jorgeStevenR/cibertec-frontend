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

// Nota en escala 0,0–5,0 (ya calculada por el backend): siempre con un decimal y
// coma, como se escribe en Colombia ("4,2", "5,0").
export function formatearNotaSobre5(valor: number): string {
  return valor.toFixed(1).replace('.', ',');
}

export function formatearFecha(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) {
    return iso;
  }
  return fecha.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

// null -> "Nunca"; reciente -> "hace X minutos/horas/días"; más de 30 días -> dd/MM/yyyy HH:mm.
export function formatearFechaRelativa(iso: string | null): string {
  if (!iso) {
    return 'Nunca';
  }
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) {
    return iso;
  }

  const segundos = Math.round((Date.now() - fecha.getTime()) / 1000);
  if (segundos < 60) {
    return 'hace instantes';
  }
  const minutos = Math.round(segundos / 60);
  if (minutos < 60) {
    return `hace ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}`;
  }
  const horas = Math.round(minutos / 60);
  if (horas < 24) {
    return `hace ${horas} ${horas === 1 ? 'hora' : 'horas'}`;
  }
  const dias = Math.round(horas / 24);
  if (dias < 30) {
    return `hace ${dias} ${dias === 1 ? 'día' : 'días'}`;
  }

  const dd = String(fecha.getDate()).padStart(2, '0');
  const mm = String(fecha.getMonth() + 1).padStart(2, '0');
  const hh = String(fecha.getHours()).padStart(2, '0');
  const min = String(fecha.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${fecha.getFullYear()} ${hh}:${min}`;
}

import { Rol } from '../models/usuario.model';
import { TipoContenido } from '../models/contenido.model';

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

export function formatearFecha(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) {
    return iso;
  }
  return fecha.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

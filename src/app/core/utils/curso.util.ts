import { Curso } from '../models/curso.model';
import { formatearFechaCalendario } from './calendario.util';

export type EstadoCupo = 'sin-limite' | 'disponible' | 'casi-lleno' | 'lleno';

// Campos del formulario de curso a los que se puede asociar un error del backend.
export type CampoCursoConError = 'codigo' | 'periodo' | 'cupoMaximo' | 'fechaInicio' | 'fechaFin';

// Mismo formato que valida el backend: "AAAA-N" (ej. "2026-2").
export const PATRON_PERIODO = /^\d{4}-\d{1,2}$/;

export function estadoCupo(matriculados: number, cupoMaximo: number | null): EstadoCupo {
  if (cupoMaximo === null) {
    return 'sin-limite';
  }
  const disponibles = cupoMaximo - matriculados;
  if (disponibles <= 0) {
    return 'lleno';
  }
  return disponibles === 1 ? 'casi-lleno' : 'disponible';
}

export function textoCupo(matriculados: number, cupoMaximo: number | null): string {
  if (cupoMaximo === null) {
    return `${matriculados} ${matriculados === 1 ? 'matriculado' : 'matriculados'} · sin límite`;
  }
  return `${matriculados} / ${cupoMaximo}`;
}

// Las fechas son "yyyy-MM-dd", que se ordena igual como texto: no hace falta `Date`.
// Con alguna fecha vacía no hay rango que comparar (lo cubre el "obligatorio" de cada campo).
export function rangoFechasValido(inicio: string | null, fin: string | null): boolean {
  if (!inicio || !fin) {
    return true;
  }
  return fin >= inicio;
}

export function formatearRangoFechas(inicio: string | null, fin: string | null): string {
  if (inicio && fin) {
    return `${formatearFechaCalendario(inicio)} – ${formatearFechaCalendario(fin)}`;
  }
  if (inicio) {
    return `Desde ${formatearFechaCalendario(inicio)}`;
  }
  if (fin) {
    return `Hasta ${formatearFechaCalendario(fin)}`;
  }
  return '—';
}

// Un curso anterior a los datos académicos trae código, período y fechas en null; el backend
// los exige para que el administrador guarde cualquier cambio (incluido publicar).
export function datosAcademicosCompletos(curso: Curso): boolean {
  return !!curso.codigo && !!curso.periodo && !!curso.fechaInicio && !!curso.fechaFin;
}

function sinTildes(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// Algunos errores del backend (409, y el 400 del PUT) llegan solo como `message`, sin el mapa
// `errores`; se reconoce a qué campo se refieren por el texto para mostrarlos junto a él.
export function campoDeMensajeCurso(mensaje: string): CampoCursoConError | null {
  const texto = sinTildes(mensaje);
  if (texto.includes('codigo')) {
    return 'codigo';
  }
  if (texto.includes('periodo')) {
    return 'periodo';
  }
  if (texto.includes('cupo')) {
    return 'cupoMaximo';
  }
  // Se pregunta por "fecha de fin" antes que por "fecha de inicio": el error de rango
  // ("La fecha de fin no puede ser anterior a la de inicio") nombra a las dos.
  if (texto.includes('fecha de fin')) {
    return 'fechaFin';
  }
  if (texto.includes('fecha de inicio')) {
    return 'fechaInicio';
  }
  return null;
}

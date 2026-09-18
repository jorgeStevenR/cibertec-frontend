export interface Curso {
  id: number;
  titulo: string;
  descripcion: string;
  profesorId: number;
  profesorNombre: string | null;
  profesorEmail: string | null;
  programaId: number | null;
  programaNombre: string | null;
  publicado: boolean;
  fechaCreacion: string;
  // Datos académicos: los cursos creados antes de que existieran los traen en null.
  codigo: string | null;
  periodo: string | null;
  // null = sin límite.
  cupoMaximo: number | null;
  // Fechas de calendario "yyyy-MM-dd" (sin hora): no convertirlas con `new Date(texto)`.
  fechaInicio: string | null;
  fechaFin: string | null;
  // Calculado por el backend; siempre presente y de solo lectura.
  matriculados: number;
}

export interface CursoCrearRequest {
  titulo: string;
  descripcion: string;
  profesorId: number;
  programaId: number;
  codigo: string;
  periodo: string;
  cupoMaximo: number | null;
  fechaInicio: string;
  fechaFin: string;
}

// Reemplazo completo, pensado para el ADMINISTRADOR: el backend exige código,
// período y fechas. Un PROFESOR solo puede cambiar título, descripción y estado;
// los cinco datos administrativos le son de solo lectura (si envía uno distinto
// responde 403).
export interface CursoActualizarRequest {
  titulo: string;
  descripcion: string;
  publicado: boolean;
  programaId: number | null;
  codigo: string;
  periodo: string;
  cupoMaximo: number | null;
  fechaInicio: string;
  fechaFin: string;
}

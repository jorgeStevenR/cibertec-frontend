export interface Entrega {
  id: number;
  actividadId: number;
  estudianteId: number;
  estudianteNombre: string | null;
  estudianteEmail: string | null;
  nombreArchivo: string;
  fechaEntrega: string;
  nota: number | null;
  // Escala 0,0–5,0 calculada por el backend; null si no está calificada.
  notaSobre5: number | null;
  comentarioDocente: string | null;
  fechaCalificacion: string | null;
}

export interface CalificarRequest {
  nota: number;
  comentario: string;
}

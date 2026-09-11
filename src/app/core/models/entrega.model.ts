export interface Entrega {
  id: number;
  actividadId: number;
  estudianteId: number;
  estudianteNombre: string | null;
  estudianteEmail: string | null;
  nombreArchivo: string;
  fechaEntrega: string;
  nota: number | null;
  comentarioDocente: string | null;
  fechaCalificacion: string | null;
}

export interface CalificarRequest {
  nota: number;
  comentario: string;
}

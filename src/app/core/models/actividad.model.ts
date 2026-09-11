export interface Actividad {
  id: number;
  moduloId: number;
  titulo: string;
  descripcion: string;
  fechaEntrega: string | null;
  puntajeMaximo: number;
  fechaCreacion: string;
}

export interface ActividadRequest {
  titulo: string;
  descripcion: string;
  fechaEntrega: string | null;
  puntajeMaximo: number;
}

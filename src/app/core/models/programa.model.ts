export interface Programa {
  id: number;
  nombre: string;
  descripcion: string;
  duracionSemestres: number;
  fechaCreacion: string;
}

export interface ProgramaCrearRequest {
  nombre: string;
  descripcion: string;
  duracionSemestres: number;
}

export interface ProgramaActualizarRequest {
  nombre: string;
  descripcion: string;
  duracionSemestres: number;
}

export interface Curso {
  id: number;
  titulo: string;
  descripcion: string;
  profesorId: number;
  publicado: boolean;
  fechaCreacion: string;
}

export interface CursoCrearRequest {
  titulo: string;
  descripcion: string;
  profesorId: number;
}

export interface CursoActualizarRequest {
  titulo: string;
  descripcion: string;
  publicado: boolean;
}

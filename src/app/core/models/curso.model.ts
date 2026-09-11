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
}

export interface CursoCrearRequest {
  titulo: string;
  descripcion: string;
  profesorId: number;
  programaId: number;
}

export interface CursoActualizarRequest {
  titulo: string;
  descripcion: string;
  publicado: boolean;
  programaId: number | null;
}

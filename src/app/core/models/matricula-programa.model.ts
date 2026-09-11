export interface MatriculaPrograma {
  id: number;
  programaId: number;
  estudianteId: number;
  estudianteNombre: string | null;
  estudianteEmail: string | null;
  fechaMatricula: string;
}

export interface MatriculaProgramaCrearRequest {
  programaId: number;
  estudianteId: number;
}

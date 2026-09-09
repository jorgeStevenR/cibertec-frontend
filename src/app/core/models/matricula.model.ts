export interface Matricula {
  id: number;
  cursoId: number;
  estudianteId: number;
  fechaMatricula: string;
}

export interface MatriculaCrearRequest {
  cursoId: number;
  estudianteId: number;
}

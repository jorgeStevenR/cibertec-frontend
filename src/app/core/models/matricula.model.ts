export interface Matricula {
  id: number;
  cursoId: number;
  estudianteId: number;
  estudianteNombre: string | null;
  estudianteEmail: string | null;
  fechaMatricula: string;
  fechaUltimoAcceso: string | null;
  estudianteUltimoLogin: string | null;
}

export interface MatriculaCrearRequest {
  cursoId: number;
  estudianteId: number;
}

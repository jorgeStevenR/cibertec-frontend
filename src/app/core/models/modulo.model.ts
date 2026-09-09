export interface Modulo {
  id: number;
  cursoId: number;
  titulo: string;
  orden: number;
}

export interface ModuloRequest {
  titulo: string;
  orden: number;
}

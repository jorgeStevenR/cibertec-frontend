export type TipoBloque = 'TEXTO' | 'IMAGEN' | 'VIDEO' | 'ARCHIVO';

export interface Bloque {
  id: number;
  moduloId: number;
  tipo: TipoBloque;
  texto: string | null;
  nombreArchivo: string | null;
  urlVideo: string | null;
  orden: number;
  fechaCreacion: string;
}

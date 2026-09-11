export type LienzoElementoTipo = 'TEXTO' | 'IMAGEN' | 'VIDEO' | 'PERSONAJE';

export interface LienzoElemento {
  id: string;
  tipo: LienzoElementoTipo;
  x: number;
  y: number;
  ancho: number;
  alto: number;
  z: number;
  texto?: string;
  imagenUrl?: string;
  videoUrl?: string;
}

export interface Lienzo {
  ancho: number;
  alto: number;
  elementos: LienzoElemento[];
}

export interface LienzoResumen {
  id: number;
  nombre: string;
  orden: number;
}

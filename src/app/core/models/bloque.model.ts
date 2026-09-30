// PERSONAJE no existe en el backend: el personaje solo se usa dentro del lienzo.
export type TipoBloque = 'TEXTO' | 'IMAGEN' | 'VIDEO' | 'ARCHIVO';

export interface Bloque {
  id: number;
  moduloId: number;
  // null = bloque suelto del módulo; número = bloque de esa página.
  paginaId: number | null;
  tipo: TipoBloque;
  texto: string | null;
  nombreArchivo: string | null;
  urlVideo: string | null;
  orden: number;
  fechaCreacion: string;
}

/**
 * Dónde viven los bloques: sueltos en un módulo o dentro de una página.
 * Los endpoints de ambos son iguales salvo la URL base.
 */
export interface ContenedorBloques {
  tipo: 'modulo' | 'pagina';
  id: number;
}

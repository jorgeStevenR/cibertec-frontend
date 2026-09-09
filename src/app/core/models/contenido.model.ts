export type TipoContenido = 'VIDEO' | 'PDF' | 'DOCUMENTO' | 'ENLACE';

export interface Contenido {
  id: number;
  moduloId: number;
  tipo: TipoContenido;
  nombre: string;
  visible: boolean;
  fechaSubida: string;
}

export interface EnlaceRequest {
  nombre: string;
  url: string;
}

export interface ContenidoUrlResponse {
  url: string;
}

export interface Cuestionario {
  id: number;
  moduloId: number;
  titulo: string;
  descripcion: string;
  fechaApertura: string | null;
  fechaEntrega: string | null;
  tiempoLimiteMinutos: number | null;
  puntajeMaximo: number;
  fechaCreacion: string;
  // Calculado por el backend con la hora del servidor — no comparar fechas a mano.
  disponible: boolean;
}

export interface CuestionarioRequest {
  titulo: string;
  descripcion: string;
  fechaApertura: string | null;
  fechaEntrega: string | null;
  tiempoLimiteMinutos: number | null;
}

export interface Opcion {
  id: number;
  texto: string;
  // Ausente por completo (no null) cuando un estudiante todavía no respondió.
  esCorrecta?: boolean;
}

export interface OpcionRequest {
  id?: number;
  texto: string;
  esCorrecta: boolean;
}

export interface Pregunta {
  id: number;
  cuestionarioId: number;
  enunciado: string;
  puntaje: number;
  orden: number;
  opciones: Opcion[];
}

export interface PreguntaRequest {
  enunciado: string;
  puntaje: number;
  opciones: OpcionRequest[];
}

export interface CuestionarioDetalle extends Cuestionario {
  preguntas: Pregunta[];
}

export interface RespuestaEnvio {
  preguntaId: number;
  opcionId: number;
}

export interface IntentoResumen {
  id: number;
  cuestionarioId: number;
  estudianteId: number;
  estudianteNombre: string | null;
  estudianteEmail: string | null;
  nota: number;
  puntajeMaximo: number;
  fechaEntrega: string;
}

export interface PreguntaConRespuesta extends Pregunta {
  opcionElegidaId: number;
}

export interface IntentoDetalle extends IntentoResumen {
  preguntas: PreguntaConRespuesta[];
}

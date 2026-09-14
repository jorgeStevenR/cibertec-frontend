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
  // Calculado por el backend con la hora del servidor — no comparar fechas a
  // mano. Ausente/null se trata como disponible (fail-open): si un backend
  // todavía no manda este campo, no debe dejar inaccesibles los cuestionarios.
  // Junto con "preguntas.length" en CuestionarioDetalle arma un estado de 3
  // valores: disponible / todavía-no-abre (preguntas=[]) / venció (preguntas
  // con contenido) — ver CuestionarioResponderComponent.noAbierto()/vencido().
  disponible?: boolean | null;
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

// Una opción de una pregunta YA calificada: a diferencia de Opcion,
// "esCorrecta" siempre está presente (el backend solo la omite antes de que
// el estudiante responda). Evita que el código de revisión trate "todavía no
// sé si es correcta" y "confirmado incorrecta" como lo mismo.
export interface OpcionCalificada extends Omit<Opcion, 'esCorrecta'> {
  esCorrecta: boolean;
}

export interface PreguntaConRespuesta extends Omit<Pregunta, 'opciones'> {
  opciones: OpcionCalificada[];
  opcionElegidaId: number;
}

export interface IntentoDetalle extends IntentoResumen {
  preguntas: PreguntaConRespuesta[];
}

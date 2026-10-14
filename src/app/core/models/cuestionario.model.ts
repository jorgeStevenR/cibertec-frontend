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

// OPCION_MULTIPLE y VERDADERO_FALSO se corrigen solas; ABIERTA la califica el
// profesor a mano. Verdadero/falso es una opción múltiple de dos opciones fijas.
export type TipoPregunta = 'OPCION_MULTIPLE' | 'VERDADERO_FALSO' | 'ABIERTA';

// PENDIENTE_REVISION: tiene respuestas abiertas que el profesor todavía no calificó.
export type EstadoIntento = 'CALIFICADO' | 'PENDIENTE_REVISION';

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
  tipo: TipoPregunta;
  enunciado: string;
  puntaje: number;
  orden: number;
  // Vacío en preguntas ABIERTA.
  opciones: Opcion[];
}

export interface PreguntaRequest {
  tipo: TipoPregunta;
  enunciado: string;
  puntaje: number;
  opciones: OpcionRequest[];
}

export interface CuestionarioDetalle extends Cuestionario {
  preguntas: Pregunta[];
}

// Cerradas: { preguntaId, opcionId }. Abiertas: { preguntaId, texto }.
export interface RespuestaEnvio {
  preguntaId: number;
  opcionId?: number;
  texto?: string;
}

export interface IntentoResumen {
  id: number;
  cuestionarioId: number;
  estudianteId: number;
  estudianteNombre: string | null;
  estudianteEmail: string | null;
  // Al profesor siempre le llega (parcial si el intento está PENDIENTE_REVISION).
  nota: number;
  puntajeMaximo: number;
  estado: EstadoIntento;
  fechaEntrega: string;
}

// Una opción de una pregunta YA calificada: a diferencia de Opcion,
// "esCorrecta" siempre está presente (el backend solo la omite antes de que
// el estudiante responda). Evita que el código de revisión trate "todavía no
// sé si es correcta" y "confirmado incorrecta" como lo mismo.
export interface OpcionCalificada extends Omit<Opcion, 'esCorrecta'> {
  esCorrecta: boolean;
}

// Lo que respondió el estudiante: la opción elegida (cerradas) o el texto y el
// puntaje que le dio el profesor (abiertas). null = sin responder / sin calificar.
export interface PreguntaConRespuesta extends Omit<Pregunta, 'opciones' | 'cuestionarioId'> {
  opciones: OpcionCalificada[];
  opcionElegidaId: number | null;
  textoRespuesta: string | null;
  puntajeObtenido: number | null;
}

export interface IntentoDetalle extends Omit<IntentoResumen, 'nota'> {
  // null cuando se le muestra al estudiante un intento PENDIENTE_REVISION: el
  // backend no manda la nota parcial.
  nota: number | null;
  preguntas: PreguntaConRespuesta[];
}

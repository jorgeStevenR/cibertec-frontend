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
  // Si el estudiante ve su nota y la revisión al finalizar. El profesor lo puede
  // cambiar en cualquier momento (vale también para los intentos ya enviados).
  mostrarNota: boolean;
}

export interface CuestionarioRequest {
  titulo: string;
  descripcion: string;
  fechaApertura: string | null;
  fechaEntrega: string | null;
  tiempoLimiteMinutos: number | null;
  mostrarNota: boolean;
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
  // Nota en escala 0,0–5,0 calculada por el backend (los puntos se siguen guardando).
  notaSobre5: number | null;
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
  // Al estudiante: null (igual que notaSobre5) mientras notaVisible sea false.
  nota: number | null;
  // mostrarNota del cuestionario && estado CALIFICADO. Al profesor le indica si
  // el estudiante ya la está viendo.
  notaVisible: boolean;
  // Al estudiante viene vacía si el profesor oculta la nota (mostrarNota false):
  // ni lo que respondió ni cuál era la correcta.
  preguntas: PreguntaConRespuesta[];
}

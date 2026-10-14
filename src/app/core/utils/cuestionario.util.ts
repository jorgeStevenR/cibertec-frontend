import { AbstractControl, FormArray, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Cuestionario, IntentoDetalle, PreguntaRequest, TipoPregunta } from '../models/cuestionario.model';

export const TIPO_PREGUNTA_LABELS: Record<TipoPregunta, string> = {
  OPCION_MULTIPLE: 'Opción múltiple',
  VERDADERO_FALSO: 'Verdadero / falso',
  ABIERTA: 'Respuesta abierta',
};

// Textos fijos de las dos opciones de una pregunta de verdadero/falso, en orden.
export const OPCIONES_VERDADERO_FALSO = ['Verdadero', 'Falso'] as const;

/** Valor crudo del formulario de pregunta del editor de cuestionarios. */
export interface PreguntaFormValor {
  tipo: TipoPregunta;
  enunciado: string;
  puntaje: number | null;
  opciones: { id: number | null; texto: string }[];
  correcta: number | null;
}

/**
 * Validador de grupo: el índice marcado como correcto debe apuntar a una opción
 * existente. Si se quita la opción marcada, el índice deja de ser válido. Las
 * preguntas abiertas no tienen opciones, así que no aplica.
 */
export function correctaValidator(
  opcionesKey = 'opciones',
  correctaKey = 'correcta',
  tipoKey = 'tipo',
): ValidatorFn {
  return (grupo: AbstractControl): ValidationErrors | null => {
    if (grupo.get(tipoKey)?.value === 'ABIERTA') {
      return null;
    }
    const opciones = grupo.get(opcionesKey) as FormArray | null;
    const correcta = grupo.get(correctaKey)?.value as number | null | undefined;
    if (!opciones) {
      return null;
    }
    const valida = typeof correcta === 'number' && correcta >= 0 && correcta < opciones.length;
    return valida ? null : { sinCorrecta: true };
  };
}

/**
 * Arma el body que espera `POST/PUT` de preguntas a partir del valor del formulario.
 * Una pregunta abierta va sin opciones aunque el formulario haya quedado con
 * alguna de antes de cambiar el tipo.
 */
export function construirPreguntaRequest(valor: PreguntaFormValor): PreguntaRequest {
  return {
    tipo: valor.tipo,
    enunciado: valor.enunciado.trim(),
    puntaje: Number(valor.puntaje),
    opciones: valor.tipo === 'ABIERTA' ? [] : valor.opciones.map((o, i) => ({
      ...(o.id !== null ? { id: o.id } : {}),
      texto: o.texto.trim(),
      esCorrecta: i === valor.correcta,
    })),
  };
}

/**
 * Nuevo índice de la opción correcta después de quitar la opción `quitada`:
 * null si se quitó justo la correcta, uno menos si estaba después.
 */
export function reindexarCorrecta(correcta: number | null, quitada: number): number | null {
  if (correcta === null || correcta === quitada) {
    return null;
  }
  return correcta > quitada ? correcta - 1 : correcta;
}

/**
 * Puntaje escrito a mano por el profesor: acepta coma o punto decimal ("0,5" o
 * "0.5"). null si está vacío o no es un número; el rango lo valida quien llama.
 */
export function leerPuntaje(texto: string): number | null {
  const limpio = texto.trim().replace(',', '.');
  if (limpio === '') {
    return null;
  }
  const valor = Number(limpio);
  return Number.isFinite(valor) ? valor : null;
}

/**
 * Estado de un cuestionario en la lista del estudiante.
 * - `undefined` en el intento = todavía no se consultó (o falló la consulta).
 * - `null` = se consultó y el estudiante no respondió (404 en mi-intento).
 */
export type EstadoCuestionarioEstudiante =
  | { tipo: 'respondido'; nota: number; puntajeMaximo: number }
  | { tipo: 'en-revision' }
  | { tipo: 'no-disponible' }
  | { tipo: 'pendiente' }
  | { tipo: 'desconocido' };

export function estadoCuestionarioEstudiante(
  cuestionario: Cuestionario,
  intento: IntentoDetalle | null | undefined,
): EstadoCuestionarioEstudiante {
  if (intento) {
    // Con respuestas abiertas sin calificar el backend no manda la nota.
    return intento.nota === null
      ? { tipo: 'en-revision' }
      : { tipo: 'respondido', nota: intento.nota, puntajeMaximo: intento.puntajeMaximo };
  }
  // Fail-open con "disponible" (ver modelo): solo un false explícito lo bloquea.
  if (cuestionario.disponible === false) {
    return { tipo: 'no-disponible' };
  }
  return intento === null ? { tipo: 'pendiente' } : { tipo: 'desconocido' };
}

import { AbstractControl, FormArray, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Cuestionario, IntentoDetalle, PreguntaRequest } from '../models/cuestionario.model';

/** Valor crudo del formulario de pregunta del editor de cuestionarios. */
export interface PreguntaFormValor {
  enunciado: string;
  puntaje: number | null;
  opciones: { id: number | null; texto: string }[];
  correcta: number | null;
}

/**
 * Validador de grupo: el índice marcado como correcto debe apuntar a una opción
 * existente. Si se quita la opción marcada, el índice deja de ser válido.
 */
export function correctaValidator(opcionesKey = 'opciones', correctaKey = 'correcta'): ValidatorFn {
  return (grupo: AbstractControl): ValidationErrors | null => {
    const opciones = grupo.get(opcionesKey) as FormArray | null;
    const correcta = grupo.get(correctaKey)?.value as number | null | undefined;
    if (!opciones) {
      return null;
    }
    const valida = typeof correcta === 'number' && correcta >= 0 && correcta < opciones.length;
    return valida ? null : { sinCorrecta: true };
  };
}

/** Arma el body que espera `POST/PUT` de preguntas a partir del valor del formulario. */
export function construirPreguntaRequest(valor: PreguntaFormValor): PreguntaRequest {
  return {
    enunciado: valor.enunciado.trim(),
    puntaje: Number(valor.puntaje),
    opciones: valor.opciones.map((o, i) => ({
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
 * Estado de un cuestionario en la lista del estudiante.
 * - `undefined` en el intento = todavía no se consultó (o falló la consulta).
 * - `null` = se consultó y el estudiante no respondió (404 en mi-intento).
 */
export type EstadoCuestionarioEstudiante =
  | { tipo: 'respondido'; nota: number; puntajeMaximo: number }
  | { tipo: 'no-disponible' }
  | { tipo: 'pendiente' }
  | { tipo: 'desconocido' };

export function estadoCuestionarioEstudiante(
  cuestionario: Cuestionario,
  intento: IntentoDetalle | null | undefined,
): EstadoCuestionarioEstudiante {
  if (intento) {
    return { tipo: 'respondido', nota: intento.nota, puntajeMaximo: intento.puntajeMaximo };
  }
  // Fail-open con "disponible" (ver modelo): solo un false explícito lo bloquea.
  if (cuestionario.disponible === false) {
    return { tipo: 'no-disponible' };
  }
  return intento === null ? { tipo: 'pendiente' } : { tipo: 'desconocido' };
}

import { HttpErrorResponse } from '@angular/common/http';
import { ErrorResponse } from '../models/error.model';

export function extraerMensajeError(
  error: HttpErrorResponse,
  fallback = 'Ocurrió un error. Intenta de nuevo.',
): string {
  const cuerpo = error.error as Partial<ErrorResponse> | null;

  if (!cuerpo?.message) {
    return fallback;
  }

  if (cuerpo.errores) {
    const detalles = Object.values(cuerpo.errores).join(' · ');
    return detalles ? `${cuerpo.message}: ${detalles}` : cuerpo.message;
  }

  return cuerpo.message;
}

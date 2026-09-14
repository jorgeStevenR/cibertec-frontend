import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import {
  Cuestionario,
  CuestionarioDetalle,
  CuestionarioRequest,
  IntentoDetalle,
  IntentoResumen,
  Pregunta,
  PreguntaRequest,
  RespuestaEnvio,
} from '../models/cuestionario.model';

@Injectable({ providedIn: 'root' })
export class CuestionarioService {
  private readonly http = inject(HttpClient);

  listarPorModulo(moduloId: number): Observable<Cuestionario[]> {
    return this.http.get<Cuestionario[]>(`${API_BASE_URL}/modulos/${moduloId}/cuestionarios`);
  }

  crear(moduloId: number, datos: CuestionarioRequest): Observable<Cuestionario> {
    return this.http.post<Cuestionario>(`${API_BASE_URL}/modulos/${moduloId}/cuestionarios`, datos);
  }

  actualizar(id: number, datos: CuestionarioRequest): Observable<Cuestionario> {
    return this.http.put<Cuestionario>(`${API_BASE_URL}/cuestionarios/${id}`, datos);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/cuestionarios/${id}`);
  }

  obtener(id: number): Observable<CuestionarioDetalle> {
    return this.http.get<CuestionarioDetalle>(`${API_BASE_URL}/cuestionarios/${id}`);
  }

  crearPregunta(cuestionarioId: number, datos: PreguntaRequest): Observable<Pregunta> {
    return this.http.post<Pregunta>(`${API_BASE_URL}/cuestionarios/${cuestionarioId}/preguntas`, datos);
  }

  actualizarPregunta(id: number, datos: PreguntaRequest): Observable<Pregunta> {
    return this.http.put<Pregunta>(`${API_BASE_URL}/preguntas/${id}`, datos);
  }

  eliminarPregunta(id: number): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/preguntas/${id}`);
  }

  listarIntentos(cuestionarioId: number): Observable<IntentoResumen[]> {
    return this.http.get<IntentoResumen[]>(`${API_BASE_URL}/cuestionarios/${cuestionarioId}/intentos`);
  }

  enviarIntento(cuestionarioId: number, respuestas: RespuestaEnvio[]): Observable<IntentoDetalle> {
    return this.http.post<IntentoDetalle>(`${API_BASE_URL}/cuestionarios/${cuestionarioId}/intentos`, {
      respuestas,
    });
  }

  obtenerMiIntento(cuestionarioId: number): Observable<IntentoDetalle | null> {
    return this.http.get<IntentoDetalle>(`${API_BASE_URL}/cuestionarios/${cuestionarioId}/mi-intento`).pipe(
      catchError((err: HttpErrorResponse) => (err.status === 404 ? of(null) : throwError(() => err))),
    );
  }
}

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { Actividad, ActividadRequest } from '../models/actividad.model';

@Injectable({ providedIn: 'root' })
export class ActividadService {
  private readonly http = inject(HttpClient);

  listarPorModulo(moduloId: number): Observable<Actividad[]> {
    return this.http.get<Actividad[]>(`${API_BASE_URL}/modulos/${moduloId}/actividades`);
  }

  crear(moduloId: number, datos: ActividadRequest): Observable<Actividad> {
    return this.http.post<Actividad>(`${API_BASE_URL}/modulos/${moduloId}/actividades`, datos);
  }

  actualizar(id: number, datos: ActividadRequest): Observable<Actividad> {
    return this.http.put<Actividad>(`${API_BASE_URL}/actividades/${id}`, datos);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/actividades/${id}`);
  }
}

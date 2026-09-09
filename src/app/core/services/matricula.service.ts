import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { Matricula, MatriculaCrearRequest } from '../models/matricula.model';

@Injectable({ providedIn: 'root' })
export class MatriculaService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/matriculas`;

  listarPorCurso(cursoId: number): Observable<Matricula[]> {
    return this.http.get<Matricula[]>(`${this.base}/curso/${cursoId}`);
  }

  matricular(datos: MatriculaCrearRequest): Observable<Matricula> {
    return this.http.post<Matricula>(this.base, datos);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}

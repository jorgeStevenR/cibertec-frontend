import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { MatriculaPrograma, MatriculaProgramaCrearRequest } from '../models/matricula-programa.model';

@Injectable({ providedIn: 'root' })
export class MatriculaProgramaService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/matriculas-programa`;

  listarPorPrograma(programaId: number): Observable<MatriculaPrograma[]> {
    return this.http.get<MatriculaPrograma[]>(`${this.base}/programa/${programaId}`);
  }

  listarPorEstudiante(estudianteId: number): Observable<MatriculaPrograma[]> {
    return this.http.get<MatriculaPrograma[]>(`${this.base}/estudiante/${estudianteId}`);
  }

  matricular(datos: MatriculaProgramaCrearRequest): Observable<MatriculaPrograma> {
    return this.http.post<MatriculaPrograma>(this.base, datos);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}

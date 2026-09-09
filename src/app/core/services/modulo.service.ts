import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { Modulo, ModuloRequest } from '../models/modulo.model';

@Injectable({ providedIn: 'root' })
export class ModuloService {
  private readonly http = inject(HttpClient);

  listarPorCurso(cursoId: number): Observable<Modulo[]> {
    return this.http.get<Modulo[]>(`${API_BASE_URL}/cursos/${cursoId}/modulos`);
  }

  obtener(id: number): Observable<Modulo> {
    return this.http.get<Modulo>(`${API_BASE_URL}/modulos/${id}`);
  }

  crear(cursoId: number, datos: ModuloRequest): Observable<Modulo> {
    return this.http.post<Modulo>(`${API_BASE_URL}/cursos/${cursoId}/modulos`, datos);
  }

  actualizar(id: number, datos: ModuloRequest): Observable<Modulo> {
    return this.http.put<Modulo>(`${API_BASE_URL}/modulos/${id}`, datos);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/modulos/${id}`);
  }
}

import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { Curso, CursoActualizarRequest, CursoCrearRequest } from '../models/curso.model';
import { PaginaResponse } from '../models/pagina.model';

export interface ListarCursosOpciones {
  pagina?: number;
  tamano?: number;
  profesorId?: number;
  programaId?: number;
}

@Injectable({ providedIn: 'root' })
export class CursoService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/cursos`;

  listar(opciones: ListarCursosOpciones = {}): Observable<PaginaResponse<Curso>> {
    let params = new HttpParams()
      .set('pagina', opciones.pagina ?? 0)
      .set('tamano', opciones.tamano ?? 20);

    if (opciones.profesorId != null) {
      params = params.set('profesorId', opciones.profesorId);
    } else if (opciones.programaId != null) {
      params = params.set('programaId', opciones.programaId);
    }

    return this.http.get<PaginaResponse<Curso>>(this.base, { params });
  }

  obtener(id: number): Observable<Curso> {
    return this.http.get<Curso>(`${this.base}/${id}`);
  }

  crear(datos: CursoCrearRequest): Observable<Curso> {
    return this.http.post<Curso>(this.base, datos);
  }

  actualizar(id: number, datos: CursoActualizarRequest): Observable<Curso> {
    return this.http.put<Curso>(`${this.base}/${id}`, datos);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}

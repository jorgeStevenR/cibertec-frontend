import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { PaginaResponse } from '../models/pagina.model';
import { Programa, ProgramaActualizarRequest, ProgramaCrearRequest } from '../models/programa.model';

export interface ListarProgramasOpciones {
  pagina?: number;
  tamano?: number;
  busqueda?: string;
}

@Injectable({ providedIn: 'root' })
export class ProgramaService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/programas`;

  listar(opciones: ListarProgramasOpciones = {}): Observable<PaginaResponse<Programa>> {
    let params = new HttpParams()
      .set('pagina', opciones.pagina ?? 0)
      .set('tamano', opciones.tamano ?? 20);

    if (opciones.busqueda) {
      params = params.set('busqueda', opciones.busqueda);
    }

    return this.http.get<PaginaResponse<Programa>>(this.base, { params });
  }

  obtener(id: number): Observable<Programa> {
    return this.http.get<Programa>(`${this.base}/${id}`);
  }

  crear(datos: ProgramaCrearRequest): Observable<Programa> {
    return this.http.post<Programa>(this.base, datos);
  }

  actualizar(id: number, datos: ProgramaActualizarRequest): Observable<Programa> {
    return this.http.put<Programa>(`${this.base}/${id}`, datos);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}

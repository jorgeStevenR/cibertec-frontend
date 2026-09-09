import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { PaginaResponse } from '../models/pagina.model';
import {
  ResetearPasswordResponse,
  Usuario,
  UsuarioActualizarRequest,
  UsuarioCrearRequest,
} from '../models/usuario.model';

export interface ListarUsuariosOpciones {
  pagina?: number;
  tamano?: number;
  busqueda?: string;
}

@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/usuarios`;

  listar(opciones: ListarUsuariosOpciones = {}): Observable<PaginaResponse<Usuario>> {
    let params = new HttpParams()
      .set('pagina', opciones.pagina ?? 0)
      .set('tamano', opciones.tamano ?? 20);

    if (opciones.busqueda) {
      params = params.set('busqueda', opciones.busqueda);
    }

    return this.http.get<PaginaResponse<Usuario>>(this.base, { params });
  }

  crear(datos: UsuarioCrearRequest): Observable<Usuario> {
    return this.http.post<Usuario>(this.base, datos);
  }

  actualizar(id: number, datos: UsuarioActualizarRequest): Observable<Usuario> {
    return this.http.put<Usuario>(`${this.base}/${id}`, datos);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  resetearPassword(id: number): Observable<ResetearPasswordResponse> {
    return this.http.post<ResetearPasswordResponse>(`${this.base}/${id}/resetear-password`, {});
  }
}

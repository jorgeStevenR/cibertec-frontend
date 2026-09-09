import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { Contenido, ContenidoUrlResponse, EnlaceRequest, TipoContenido } from '../models/contenido.model';

@Injectable({ providedIn: 'root' })
export class ContenidoService {
  private readonly http = inject(HttpClient);

  listarPorModulo(moduloId: number): Observable<Contenido[]> {
    return this.http.get<Contenido[]>(`${API_BASE_URL}/modulos/${moduloId}/contenidos`);
  }

  subirArchivo(
    moduloId: number,
    tipo: Exclude<TipoContenido, 'ENLACE'>,
    archivo: File,
  ): Observable<Contenido> {
    const formData = new FormData();
    formData.append('archivo', archivo);
    const params = new HttpParams().set('tipo', tipo);
    return this.http.post<Contenido>(`${API_BASE_URL}/modulos/${moduloId}/contenidos`, formData, {
      params,
    });
  }

  agregarEnlace(moduloId: number, datos: EnlaceRequest): Observable<Contenido> {
    return this.http.post<Contenido>(`${API_BASE_URL}/modulos/${moduloId}/contenidos/enlace`, datos);
  }

  obtenerUrl(id: number): Observable<ContenidoUrlResponse> {
    return this.http.get<ContenidoUrlResponse>(`${API_BASE_URL}/contenidos/${id}/url`);
  }

  cambiarVisibilidad(id: number, visible: boolean): Observable<Contenido> {
    const params = new HttpParams().set('visible', String(visible));
    return this.http.patch<Contenido>(`${API_BASE_URL}/contenidos/${id}/visibilidad`, null, { params });
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/contenidos/${id}`);
  }
}

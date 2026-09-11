import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { Bloque, TipoBloque } from '../models/bloque.model';

@Injectable({ providedIn: 'root' })
export class BloqueService {
  private readonly http = inject(HttpClient);

  listarPorModulo(moduloId: number): Observable<Bloque[]> {
    return this.http.get<Bloque[]>(`${API_BASE_URL}/modulos/${moduloId}/bloques`);
  }

  crearTexto(moduloId: number, texto: string): Observable<Bloque> {
    return this.http.post<Bloque>(`${API_BASE_URL}/modulos/${moduloId}/bloques/texto`, { texto });
  }

  crearVideo(moduloId: number, urlVideo: string): Observable<Bloque> {
    return this.http.post<Bloque>(`${API_BASE_URL}/modulos/${moduloId}/bloques/video`, { urlVideo });
  }

  subirArchivo(moduloId: number, tipo: Extract<TipoBloque, 'IMAGEN' | 'ARCHIVO'>, archivo: File): Observable<Bloque> {
    const formData = new FormData();
    formData.append('archivo', archivo);
    const params = new HttpParams().set('tipo', tipo);
    return this.http.post<Bloque>(`${API_BASE_URL}/modulos/${moduloId}/bloques/archivo`, formData, { params });
  }

  crearPersonaje(moduloId: number, imagen: File, texto: string): Observable<Bloque> {
    const formData = new FormData();
    formData.append('archivo', imagen);
    formData.append('texto', texto);
    return this.http.post<Bloque>(`${API_BASE_URL}/modulos/${moduloId}/bloques/personaje`, formData);
  }

  actualizarTexto(id: number, texto: string): Observable<Bloque> {
    return this.http.put<Bloque>(`${API_BASE_URL}/bloques/${id}/texto`, { texto });
  }

  reordenar(moduloId: number, ids: number[]): Observable<void> {
    return this.http.patch<void>(`${API_BASE_URL}/modulos/${moduloId}/bloques/orden`, { ids });
  }

  obtenerUrl(id: number): Observable<{ url: string }> {
    return this.http.get<{ url: string }>(`${API_BASE_URL}/bloques/${id}/url`);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/bloques/${id}`);
  }
}

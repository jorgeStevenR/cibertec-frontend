import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { Lienzo, LienzoResumen } from '../models/lienzo.model';

@Injectable({ providedIn: 'root' })
export class LienzoService {
  private readonly http = inject(HttpClient);

  listar(moduloId: number): Observable<LienzoResumen[]> {
    const params = new HttpParams().set('_', Date.now());
    return this.http.get<LienzoResumen[]>(`${API_BASE_URL}/modulos/${moduloId}/lienzos`, { params });
  }

  crear(moduloId: number, nombre: string): Observable<LienzoResumen> {
    return this.http.post<LienzoResumen>(`${API_BASE_URL}/modulos/${moduloId}/lienzos`, { nombre });
  }

  renombrar(lienzoId: number, nombre: string): Observable<LienzoResumen> {
    return this.http.put<LienzoResumen>(`${API_BASE_URL}/lienzos/${lienzoId}/nombre`, { nombre });
  }

  eliminar(lienzoId: number): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/lienzos/${lienzoId}`);
  }

  obtener(lienzoId: number): Observable<Lienzo> {
    // Cache-buster: evita que el navegador sirva una respuesta vieja cacheada
    // justo después de guardar cambios en el lienzo.
    const params = new HttpParams().set('_', Date.now());
    return this.http.get<Lienzo>(`${API_BASE_URL}/lienzos/${lienzoId}`, { params });
  }

  guardar(lienzoId: number, lienzo: Lienzo): Observable<Lienzo> {
    return this.http.put<Lienzo>(`${API_BASE_URL}/lienzos/${lienzoId}`, lienzo);
  }

  subirImagen(lienzoId: number, archivo: File): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('archivo', archivo);
    return this.http.post<{ url: string }>(`${API_BASE_URL}/lienzos/${lienzoId}/imagenes`, formData);
  }
}

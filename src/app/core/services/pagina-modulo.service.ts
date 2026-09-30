import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { PaginaModulo, PaginaModuloRequest } from '../models/pagina-modulo.model';

/** Recurso "Página" de los módulos (no la paginación de listados). */
@Injectable({ providedIn: 'root' })
export class PaginaModuloService {
  private readonly http = inject(HttpClient);

  listarPorModulo(moduloId: number): Observable<PaginaModulo[]> {
    return this.http.get<PaginaModulo[]>(`${API_BASE_URL}/modulos/${moduloId}/paginas`);
  }

  crear(moduloId: number, datos: PaginaModuloRequest): Observable<PaginaModulo> {
    return this.http.post<PaginaModulo>(`${API_BASE_URL}/modulos/${moduloId}/paginas`, datos);
  }

  obtener(id: number): Observable<PaginaModulo> {
    return this.http.get<PaginaModulo>(`${API_BASE_URL}/paginas/${id}`);
  }

  actualizar(id: number, datos: PaginaModuloRequest): Observable<PaginaModulo> {
    return this.http.put<PaginaModulo>(`${API_BASE_URL}/paginas/${id}`, datos);
  }

  // Borra también los bloques de la página y sus archivos.
  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/paginas/${id}`);
  }

  // Siempre la lista completa de ids del módulo, en el nuevo orden.
  reordenar(moduloId: number, ids: number[]): Observable<void> {
    return this.http.patch<void>(`${API_BASE_URL}/modulos/${moduloId}/paginas/orden`, { ids });
  }
}

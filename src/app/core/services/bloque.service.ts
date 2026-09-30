import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { Bloque, ContenedorBloques, TipoBloque } from '../models/bloque.model';

@Injectable({ providedIn: 'root' })
export class BloqueService {
  private readonly http = inject(HttpClient);

  // /modulos/{id}/bloques o /paginas/{id}/bloques
  private base(contenedor: ContenedorBloques): string {
    const recurso = contenedor.tipo === 'modulo' ? 'modulos' : 'paginas';
    return `${API_BASE_URL}/${recurso}/${contenedor.id}/bloques`;
  }

  listar(contenedor: ContenedorBloques): Observable<Bloque[]> {
    return this.http.get<Bloque[]>(this.base(contenedor));
  }

  // Solo los bloques sueltos (paginaId = null): los de las páginas no vienen acá.
  listarPorModulo(moduloId: number): Observable<Bloque[]> {
    return this.listar({ tipo: 'modulo', id: moduloId });
  }

  crearTexto(contenedor: ContenedorBloques, texto: string): Observable<Bloque> {
    return this.http.post<Bloque>(`${this.base(contenedor)}/texto`, { texto });
  }

  crearVideo(contenedor: ContenedorBloques, urlVideo: string): Observable<Bloque> {
    return this.http.post<Bloque>(`${this.base(contenedor)}/video`, { urlVideo });
  }

  subirArchivo(
    contenedor: ContenedorBloques,
    tipo: Extract<TipoBloque, 'IMAGEN' | 'ARCHIVO'>,
    archivo: File,
  ): Observable<Bloque> {
    const formData = new FormData();
    formData.append('archivo', archivo);
    const params = new HttpParams().set('tipo', tipo);
    return this.http.post<Bloque>(`${this.base(contenedor)}/archivo`, formData, { params });
  }

  // Siempre la lista completa de ids, en el nuevo orden (si no, el backend responde 400).
  reordenar(contenedor: ContenedorBloques, ids: number[]): Observable<void> {
    return this.http.patch<void>(`${this.base(contenedor)}/orden`, { ids });
  }

  actualizarTexto(id: number, texto: string): Observable<Bloque> {
    return this.http.put<Bloque>(`${API_BASE_URL}/bloques/${id}/texto`, { texto });
  }

  // URL firmada que expira a los 15 minutos: pedirla al mostrar, no guardarla.
  obtenerUrl(id: number): Observable<{ url: string }> {
    return this.http.get<{ url: string }>(`${API_BASE_URL}/bloques/${id}/url`);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/bloques/${id}`);
  }
}

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { CalificarRequest, Entrega } from '../models/entrega.model';

@Injectable({ providedIn: 'root' })
export class EntregaService {
  private readonly http = inject(HttpClient);

  entregar(actividadId: number, archivo: File): Observable<Entrega> {
    const formData = new FormData();
    formData.append('archivo', archivo);
    return this.http.post<Entrega>(`${API_BASE_URL}/actividades/${actividadId}/entregas`, formData);
  }

  listarPorActividad(actividadId: number): Observable<Entrega[]> {
    return this.http.get<Entrega[]>(`${API_BASE_URL}/actividades/${actividadId}/entregas`);
  }

  obtenerMiEntrega(actividadId: number): Observable<Entrega | null> {
    return this.http.get<Entrega | null>(`${API_BASE_URL}/actividades/${actividadId}/entregas/mia`);
  }

  calificar(entregaId: number, datos: CalificarRequest): Observable<Entrega> {
    return this.http.patch<Entrega>(`${API_BASE_URL}/entregas/${entregaId}/calificar`, datos);
  }

  obtenerUrl(entregaId: number): Observable<{ url: string }> {
    return this.http.get<{ url: string }>(`${API_BASE_URL}/entregas/${entregaId}/url`);
  }
}

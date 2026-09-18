import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { CalificacionesCurso, ResumenCurso, Vencimiento } from '../models/estudiante-avance.model';

@Injectable({ providedIn: 'root' })
export class EstudianteAvanceService {
  private readonly http = inject(HttpClient);

  private base(estudianteId: number): string {
    return `${API_BASE_URL}/estudiantes/${estudianteId}`;
  }

  resumenCursos(estudianteId: number): Observable<ResumenCurso[]> {
    return this.http.get<ResumenCurso[]>(`${this.base(estudianteId)}/cursos/resumen`);
  }

  // desde/hasta en formato YYYY-MM-DD (rango inclusivo, días completos).
  vencimientos(estudianteId: number, desde?: string, hasta?: string): Observable<Vencimiento[]> {
    let params = new HttpParams();
    if (desde) {
      params = params.set('desde', desde);
    }
    if (hasta) {
      params = params.set('hasta', hasta);
    }
    return this.http.get<Vencimiento[]>(`${this.base(estudianteId)}/vencimientos`, { params });
  }

  calificaciones(estudianteId: number, cursoId?: number): Observable<CalificacionesCurso[]> {
    let params = new HttpParams();
    if (cursoId != null) {
      params = params.set('cursoId', cursoId);
    }
    return this.http.get<CalificacionesCurso[]>(`${this.base(estudianteId)}/calificaciones`, { params });
  }
}

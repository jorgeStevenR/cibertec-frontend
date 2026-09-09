import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { LoginRequest, LoginResponse, Usuario } from '../models/usuario.model';

const TOKEN_KEY = 'cibertec_token';
const USUARIO_KEY = 'cibertec_usuario';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly usuarioActual = signal<Usuario | null>(this.leerUsuarioGuardado());

  constructor(private readonly http: HttpClient) {}

  login(credenciales: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${API_BASE_URL}/auth/login`, credenciales).pipe(
      tap((respuesta) => {
        localStorage.setItem(TOKEN_KEY, respuesta.token);
        localStorage.setItem(USUARIO_KEY, JSON.stringify(respuesta.usuario));
        this.usuarioActual.set(respuesta.usuario);
      }),
    );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USUARIO_KEY);
    this.usuarioActual.set(null);
  }

  obtenerToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  estaAutenticado(): boolean {
    return this.obtenerToken() !== null;
  }

  private leerUsuarioGuardado(): Usuario | null {
    const crudo = localStorage.getItem(USUARIO_KEY);
    return crudo ? (JSON.parse(crudo) as Usuario) : null;
  }
}

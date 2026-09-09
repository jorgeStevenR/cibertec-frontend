export type Rol = 'ADMINISTRADOR' | 'PROFESOR' | 'ESTUDIANTE';

export interface Usuario {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  rol: Rol;
  activo: boolean;
  fechaCreacion: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  usuario: Usuario;
}

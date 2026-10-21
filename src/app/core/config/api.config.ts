import { environment } from '../../../environments/environment';

// La URL del backend sale del environment de Angular: localhost en desarrollo y
// la variable API_BASE_URL del hosting en producción (ver README.md).
export const API_BASE_URL = environment.apiBaseUrl;

if (API_BASE_URL.startsWith('__')) {
  console.error(
    'La URL del backend no está configurada: compilá con `npm run build:produccion` y la variable API_BASE_URL.',
  );
}

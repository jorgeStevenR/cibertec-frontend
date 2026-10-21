// Escribe la URL del backend en el environment de producción antes de compilar.
// Uso (en el hosting): API_BASE_URL=https://mi-backend.com/api npm run build:produccion
import { readFileSync, writeFileSync } from 'node:fs';

const ARCHIVO = 'src/environments/environment.ts';
const MARCADOR = '__API_BASE_URL__';

const url = (process.env.API_BASE_URL ?? '').trim().replace(/\/+$/, '');

if (!url) {
  console.error('Falta la variable de entorno API_BASE_URL (ej. https://mi-backend.com/api).');
  process.exit(1);
}
if (!/^https?:\/\//.test(url)) {
  console.error(`API_BASE_URL debe empezar con http:// o https:// (llegó "${url}").`);
  process.exit(1);
}
if (url.startsWith('http://') && !/^http:\/\/(localhost|127\.0\.0\.1)/.test(url)) {
  // Un front servido por HTTPS no puede llamar a una API por HTTP (contenido mixto).
  console.warn('Aviso: API_BASE_URL usa http://; el navegador va a bloquearla si el front se sirve por https.');
}

const contenido = readFileSync(ARCHIVO, 'utf8');
if (!contenido.includes(MARCADOR)) {
  console.error(`No se encontró el marcador ${MARCADOR} en ${ARCHIVO} (¿ya se configuró?).`);
  process.exit(1);
}
writeFileSync(ARCHIVO, contenido.replace(MARCADOR, url));
console.log(`API_BASE_URL configurada: ${url}`);

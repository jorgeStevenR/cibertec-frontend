# LMS CIBERCTEC — Frontend

Plataforma educativa tipo aula virtual (MVP de práctica profesional UNIMINUTO –
CIBERCTEC). Este repositorio es el **frontend** en Angular; consume la API REST del
backend Spring Boot (repositorio aparte, `../backend`).

Permite gestionar programas, cursos, matrículas y usuarios, y dentro de cada curso
módulos con páginas, recursos, actividades con entrega de archivo y cuestionarios
(opción múltiple, verdadero/falso y respuesta abierta) con notas en escala 0,0–5,0.

## Roles

| Rol | Qué hace |
|---|---|
| **Administrador** | Programas, cursos (asigna profesor y programa) y matrículas. Ve usuarios y contenido en solo lectura. |
| **Gestor de usuarios** | Crea, edita, desactiva y resetea la contraseña de profesores y estudiantes. |
| **Profesor** | Arma el contenido de sus cursos (módulos, páginas, actividades, cuestionarios), califica y decide si el estudiante ve la nota de cada cuestionario. |
| **Estudiante** | Ve sus cursos, entrega actividades, responde cuestionarios y consulta su avance, calendario y calificaciones. |

## Requisitos

- Node.js LTS reciente (22 o superior; probado con 26.7) y npm.
- El backend corriendo (por defecto en `http://localhost:8080`).

## Correr en local

```bash
npm install
npm start
```

Abre `http://localhost:4200`. En desarrollo la app llama a `http://localhost:8080/api`.

## Apuntar a otro backend

La URL sale de los environments de Angular (`src/environments/`):

- **Desarrollo** (`npm start`): `environment.development.ts`. Para usar otro
  backend local, cambiá `apiBaseUrl` en ese archivo.
- **Producción**: `environment.ts` tiene el marcador `__API_BASE_URL__`, que se
  reemplaza al compilar con la variable de entorno `API_BASE_URL`:

  ```bash
  API_BASE_URL=https://mi-backend.com/api npm run build:produccion
  ```

  El resultado queda en `dist/frontend/browser`. Sin la variable, el comando
  falla a propósito para no publicar una app sin backend configurado.

### Publicar (Vercel o Netlify)

`vercel.json` y `netlify.toml` ya traen el comando de build, la carpeta de salida y
la redirección de todas las rutas a `index.html` (sin eso, recargar una URL como
`/estudiante/cursos/31` da 404). En el panel del hosting solo hay que:

1. Conectar el repositorio.
2. Definir la variable de entorno `API_BASE_URL` (ej. `https://mi-backend.com/api`).

Además, del lado del backend:

- Tiene que estar publicado con **HTTPS** (una página HTTPS no puede llamar a una API HTTP).
- Su configuración de **CORS** tiene que permitir el dominio del frontend publicado
  (hoy solo permite `http://localhost:4200`).

## Tests

```bash
npm test                 # Vitest en modo watch
npx ng test --watch=false  # una sola corrida (CI)
```

## Más contexto

- `CLAUDE.md`: convenciones del proyecto (standalone components, signals, español en el dominio, accesibilidad).
- `HISTORIAL.md`: estado actual, decisiones y log de cada sesión de trabajo.

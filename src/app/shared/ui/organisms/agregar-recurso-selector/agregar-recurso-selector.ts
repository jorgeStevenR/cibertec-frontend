import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { UiModal } from '../../molecules/ui-modal/ui-modal';
import { TipoBloque } from '../../../../core/models/bloque.model';

/** Todo lo que se puede agregar a un módulo desde el selector único. */
export type TipoRecurso = TipoBloque | 'PAGINA' | 'LIENZO' | 'ACTIVIDAD' | 'CUESTIONARIO';

interface OpcionRecurso {
  tipo: TipoRecurso;
  icono: string;
  nombre: string;
  descripcion: string;
}

interface GrupoRecursos {
  titulo: string;
  opciones: OpcionRecurso[];
}

const GRUPOS: GrupoRecursos[] = [
  {
    titulo: 'Actividades',
    opciones: [
      { tipo: 'ACTIVIDAD', icono: '📤', nombre: 'Actividad', descripcion: 'Tarea: el estudiante entrega un archivo y tú lo calificas.' },
      { tipo: 'CUESTIONARIO', icono: '📝', nombre: 'Cuestionario', descripcion: 'Opción múltiple, verdadero/falso o respuesta abierta.' },
    ],
  },
  {
    titulo: 'Recursos',
    opciones: [
      { tipo: 'PAGINA', icono: '📄', nombre: 'Página', descripcion: 'Una página con título y contenido apilado: texto, imágenes, videos, archivos.' },
      { tipo: 'TEXTO', icono: '🔤', nombre: 'Texto', descripcion: 'Un párrafo o explicación, directo en el módulo.' },
      { tipo: 'IMAGEN', icono: '🖼️', nombre: 'Imagen', descripcion: 'Una foto o diagrama.' },
      { tipo: 'VIDEO', icono: '🎬', nombre: 'Video', descripcion: 'Un video de YouTube.' },
      { tipo: 'ARCHIVO', icono: '📎', nombre: 'Archivo', descripcion: 'PDF, presentación u otro documento.' },
      { tipo: 'LIENZO', icono: '🎨', nombre: 'Contenido personalizable', descripcion: 'Diseño libre tipo Canva, con personajes, imágenes y videos.' },
    ],
  },
];

@Component({
  selector: 'app-agregar-recurso-selector',
  standalone: true,
  imports: [CommonModule, UiModal],
  templateUrl: './agregar-recurso-selector.html',
  styleUrl: './agregar-recurso-selector.scss',
})
export class AgregarRecursoSelector {
  readonly open = input(false);
  readonly elegido = output<TipoRecurso>();
  readonly closed = output<void>();

  readonly grupos = GRUPOS;
}

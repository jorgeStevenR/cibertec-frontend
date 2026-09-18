import { EstadoVencimiento, TipoItem } from './estudiante-avance.model';

export interface EventoCalendario {
  fecha: string;
  titulo: string;
  curso: string;
  tipo: TipoItem;
  estado: EstadoVencimiento;
}

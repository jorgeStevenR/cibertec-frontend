import { EventoCalendario } from '../models/evento-calendario.model';

export interface DiaCalendario {
  dia: number;
  clave: string;
}

export type EstadoDia = 'vencido' | 'pendiente' | 'completado';

const pad = (n: number): string => String(n).padStart(2, '0');

export function claveDia(fecha: Date): string {
  return `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}`;
}

// Una fecha sin hora ("2026-09-25") se interpretaría como UTC y podría caer el día anterior
// en horario local; se la trata como medianoche local.
export function parsearFecha(texto: string): Date {
  return new Date(/^\d{4}-\d{2}-\d{2}$/.test(texto) ? `${texto}T00:00:00` : texto);
}

// Semanas de un mes con la semana empezando en lunes; las celdas fuera del mes son null.
export function semanasDelMes(anio: number, mes: number): (DiaCalendario | null)[][] {
  const desfase = (new Date(anio, mes, 1).getDay() + 6) % 7;
  const diasEnMes = new Date(anio, mes + 1, 0).getDate();

  const celdas: (DiaCalendario | null)[] = Array.from({ length: desfase }, () => null);
  for (let dia = 1; dia <= diasEnMes; dia++) {
    celdas.push({ dia, clave: claveDia(new Date(anio, mes, dia)) });
  }
  while (celdas.length % 7 !== 0) {
    celdas.push(null);
  }

  const semanas: (DiaCalendario | null)[][] = [];
  for (let i = 0; i < celdas.length; i += 7) {
    semanas.push(celdas.slice(i, i + 7));
  }
  return semanas;
}

// Primer y último día del mes en formato YYYY-MM-DD, listos para desde/hasta de la API.
export function rangoDelMes(anio: number, mes: number): { desde: string; hasta: string } {
  return {
    desde: claveDia(new Date(anio, mes, 1)),
    hasta: claveDia(new Date(anio, mes + 1, 0)),
  };
}

export function agruparPorDia(eventos: EventoCalendario[]): Map<string, EventoCalendario[]> {
  const mapa = new Map<string, EventoCalendario[]>();
  for (const evento of eventos) {
    const fecha = parsearFecha(evento.fecha);
    if (Number.isNaN(fecha.getTime())) {
      continue;
    }
    const clave = claveDia(fecha);
    mapa.set(clave, [...(mapa.get(clave) ?? []), evento]);
  }
  return mapa;
}

// Un día con algo vencido se marca vencido; si no, pendiente; y si todo está hecho, completado.
export function estadoDelDia(eventos: EventoCalendario[]): EstadoDia | null {
  if (eventos.length === 0) {
    return null;
  }
  if (eventos.some((e) => e.estado === 'VENCIDA')) {
    return 'vencido';
  }
  if (eventos.some((e) => e.estado === 'PENDIENTE')) {
    return 'pendiente';
  }
  return 'completado';
}

export function eventosDelMes(eventos: EventoCalendario[], anio: number, mes: number): EventoCalendario[] {
  return eventos
    .filter((e) => {
      const fecha = parsearFecha(e.fecha);
      return fecha.getFullYear() === anio && fecha.getMonth() === mes;
    })
    .sort((a, b) => parsearFecha(a.fecha).getTime() - parsearFecha(b.fecha).getTime());
}

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// Fecha de calendario ("yyyy-MM-dd") para mostrar, sin pasar por `Date`: así ninguna zona
// horaria puede correrla un día. Devuelve "—" si no hay fecha y el texto original si no es
// una fecha de calendario.
export function formatearFechaCalendario(texto: string | null): string {
  if (!texto) {
    return '—';
  }
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
  if (!partes) {
    return texto;
  }
  const mes = MESES_CORTOS[Number(partes[2]) - 1];
  return mes ? `${Number(partes[3])} ${mes} ${partes[1]}` : texto;
}

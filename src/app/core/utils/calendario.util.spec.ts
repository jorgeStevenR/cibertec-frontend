import { EstadoVencimiento } from '../models/estudiante-avance.model';
import { EventoCalendario } from '../models/evento-calendario.model';
import {
  agruparPorDia,
  claveDia,
  estadoDelDia,
  eventosDelMes,
  parsearFecha,
  rangoDelMes,
  semanasDelMes,
} from './calendario.util';

const evento = (fecha: string, titulo = 'Tarea', estado: EstadoVencimiento = 'PENDIENTE'): EventoCalendario => ({
  fecha,
  titulo,
  curso: 'Curso',
  tipo: 'ACTIVIDAD',
  estado,
});

describe('semanasDelMes', () => {
  it('septiembre de 2026 empieza en martes y ocupa 5 semanas', () => {
    const semanas = semanasDelMes(2026, 8);

    expect(semanas.length).toBe(5);
    expect(semanas[0][0]).toBeNull();
    expect(semanas[0][1]?.dia).toBe(1);
    expect(semanas[4][2]?.dia).toBe(30);
  });

  it('cada semana tiene 7 celdas', () => {
    expect(semanasDelMes(2026, 1).every((s) => s.length === 7)).toBe(true);
  });

  it('un mes que empieza en lunes no tiene celdas vacías al inicio', () => {
    // 1 de junio de 2026 es lunes
    expect(semanasDelMes(2026, 5)[0][0]?.dia).toBe(1);
  });
});

describe('claveDia', () => {
  it('formatea con ceros a la izquierda', () => {
    expect(claveDia(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('rangoDelMes', () => {
  it('devuelve el primer y último día del mes', () => {
    expect(rangoDelMes(2026, 8)).toEqual({ desde: '2026-09-01', hasta: '2026-09-30' });
  });

  it('respeta los años bisiestos', () => {
    expect(rangoDelMes(2028, 1).hasta).toBe('2028-02-29');
  });

  it('cambia de año correctamente en diciembre', () => {
    expect(rangoDelMes(2026, 11)).toEqual({ desde: '2026-12-01', hasta: '2026-12-31' });
  });
});

describe('parsearFecha', () => {
  it('trata una fecha sin hora como día local, no UTC', () => {
    const fecha = parsearFecha('2026-09-25');

    expect(fecha.getDate()).toBe(25);
    expect(fecha.getHours()).toBe(0);
  });

  it('respeta la hora de una fecha-hora sin zona', () => {
    expect(parsearFecha('2026-09-25T23:59:00').getHours()).toBe(23);
  });
});

describe('agruparPorDia', () => {
  it('agrupa eventos del mismo día', () => {
    const mapa = agruparPorDia([evento('2026-09-18T10:00:00'), evento('2026-09-18T20:00:00'), evento('2026-09-19T08:00:00')]);

    expect(mapa.get('2026-09-18')?.length).toBe(2);
    expect(mapa.get('2026-09-19')?.length).toBe(1);
  });

  it('ignora fechas inválidas', () => {
    expect(agruparPorDia([evento('no-es-fecha')]).size).toBe(0);
  });
});

describe('estadoDelDia', () => {
  it('sin eventos devuelve null', () => {
    expect(estadoDelDia([])).toBeNull();
  });

  it('vencido tiene prioridad sobre pendiente', () => {
    expect(estadoDelDia([evento('2026-09-18', 'A', 'PENDIENTE'), evento('2026-09-18', 'B', 'VENCIDA')])).toBe('vencido');
  });

  it('pendiente tiene prioridad sobre completado', () => {
    expect(estadoDelDia([evento('2026-09-18', 'A', 'ENTREGADA'), evento('2026-09-18', 'B', 'PENDIENTE')])).toBe('pendiente');
  });

  it('si todo está hecho, es completado', () => {
    expect(estadoDelDia([evento('2026-09-18', 'A', 'ENTREGADA'), evento('2026-09-18', 'B', 'RENDIDO')])).toBe('completado');
  });
});

describe('eventosDelMes', () => {
  it('deja solo los del mes pedido y los ordena por fecha', () => {
    const resultado = eventosDelMes(
      [evento('2026-09-25T10:00:00', 'C'), evento('2026-10-02T10:00:00', 'Otro mes'), evento('2026-09-20T10:00:00', 'B')],
      2026,
      8,
    );

    expect(resultado.map((e) => e.titulo)).toEqual(['B', 'C']);
  });
});

import { formatearPuntaje, porcentajePuntaje } from './labels.util';

describe('formatearPuntaje', () => {
  it('muestra los enteros sin decimales', () => {
    expect(formatearPuntaje(18)).toBe('18');
    expect(formatearPuntaje(0)).toBe('0');
  });

  it('muestra una cifra decimal cuando hace falta', () => {
    expect(formatearPuntaje(17.5)).toBe('17.5');
    expect(formatearPuntaje(17.25)).toBe('17.3');
  });
});

describe('porcentajePuntaje', () => {
  it('calcula el porcentaje entero', () => {
    expect(porcentajePuntaje(35, 40)).toBe(88);
    expect(porcentajePuntaje(19, 30)).toBe(63);
  });

  it('devuelve null si todavía no hay nada calificado (0 / 0)', () => {
    expect(porcentajePuntaje(0, 0)).toBeNull();
  });

  it('un curso calificado con nota cero da 0%, no null', () => {
    expect(porcentajePuntaje(0, 20)).toBe(0);
  });
});

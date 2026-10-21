import { formatearNotaSobre5, formatearPuntaje } from './labels.util';

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

describe('formatearNotaSobre5', () => {
  it('siempre muestra un decimal con coma', () => {
    expect(formatearNotaSobre5(5)).toBe('5,0');
    expect(formatearNotaSobre5(0)).toBe('0,0');
    expect(formatearNotaSobre5(4.2)).toBe('4,2');
  });
});

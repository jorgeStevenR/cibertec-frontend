import {
  arcosDona,
  contarPorMes,
  escalarBarras,
  escalarPuntos,
  rutaArea,
  rutaLinea,
  techoEscala,
  ultimosMeses,
} from './graficos.util';

describe('ultimosMeses', () => {
  it('devuelve los meses del más antiguo al más reciente', () => {
    const meses = ultimosMeses(3, new Date(2026, 8, 18));

    expect(meses.map((m) => m.etiqueta)).toEqual(['jul', 'ago', 'sep']);
    expect(meses[2]).toEqual({ anio: 2026, mes: 8, etiqueta: 'sep' });
  });

  it('cruza el cambio de año', () => {
    const meses = ultimosMeses(3, new Date(2026, 0, 10));

    expect(meses.map((m) => `${m.anio}-${m.mes}`)).toEqual(['2025-10', '2025-11', '2026-0']);
  });
});

describe('contarPorMes', () => {
  const meses = ultimosMeses(3, new Date(2026, 8, 18));

  it('cuenta las fechas de cada mes y descarta las de fuera de rango', () => {
    const conteo = contarPorMes(['2026-07-05T10:00:00', '2026-09-01T08:00:00', '2026-09-20T08:00:00', '2025-01-01T00:00:00'], meses);

    expect(conteo).toEqual([1, 0, 2]);
  });

  it('ignora fechas inválidas', () => {
    expect(contarPorMes(['no-es-fecha'], meses)).toEqual([0, 0, 0]);
  });

  it('una fecha sin hora cae en su día local', () => {
    expect(contarPorMes(['2026-09-01'], meses)).toEqual([0, 0, 1]);
  });
});

describe('techoEscala', () => {
  it('usa 5 como mínimo', () => {
    expect(techoEscala(0)).toBe(5);
    expect(techoEscala(3)).toBe(5);
  });

  it('redondea hacia arriba según la magnitud', () => {
    expect(techoEscala(7)).toBe(7);
    expect(techoEscala(12)).toBe(20);
    expect(techoEscala(230)).toBe(300);
  });
});

describe('escalarPuntos', () => {
  const margen = { izq: 10, der: 10, arr: 10, aba: 10 };

  it('reparte los puntos en el ancho y los invierte en vertical', () => {
    const puntos = escalarPuntos([0, 5], 120, 110, margen);

    expect(puntos[0]).toEqual({ x: 10, y: 100 });
    expect(puntos[1]).toEqual({ x: 110, y: 10 });
  });

  it('un solo punto queda centrado', () => {
    expect(escalarPuntos([2], 120, 110, margen)[0].x).toBe(60);
  });

  it('todo en cero queda sobre la base', () => {
    expect(escalarPuntos([0, 0, 0], 120, 110, margen).every((p) => p.y === 100)).toBe(true);
  });
});

describe('rutaLinea y rutaArea', () => {
  const puntos = [
    { x: 10, y: 50 },
    { x: 20, y: 30 },
  ];

  it('arma la línea con M y L', () => {
    expect(rutaLinea(puntos)).toBe('M10 50 L20 30');
  });

  it('cierra el área contra la base', () => {
    expect(rutaArea(puntos, 90)).toBe('M10 50 L20 30 L20 90 L10 90 Z');
  });

  it('sin puntos no genera ruta', () => {
    expect(rutaArea([], 90)).toBe('');
  });
});

describe('arcosDona', () => {
  const segmentos = [
    { etiqueta: 'A', valor: 3, color: '#111' },
    { etiqueta: 'B', valor: 1, color: '#222' },
    { etiqueta: 'C', valor: 0, color: '#333' },
  ];

  it('calcula porcentajes y omite los segmentos en cero', () => {
    const arcos = arcosDona(segmentos, 50, 50, 40, 25);

    expect(arcos.map((a) => a.etiqueta)).toEqual(['A', 'B']);
    expect(arcos.map((a) => a.porcentaje)).toEqual([75, 25]);
  });

  it('el segmento mayor a la mitad usa el arco grande', () => {
    const [a, b] = arcosDona(segmentos, 50, 50, 40, 25);

    expect(a.ruta).toContain(' 0 1 1 ');
    expect(b.ruta).toContain(' 0 0 1 ');
  });

  it('sin datos no hay arcos', () => {
    expect(arcosDona([{ etiqueta: 'A', valor: 0, color: '#111' }], 50, 50, 40, 25)).toEqual([]);
  });

  it('un único segmento al 100% igual genera un arco dibujable', () => {
    const [unico] = arcosDona([{ etiqueta: 'A', valor: 4, color: '#111' }], 50, 50, 40, 25);

    expect(unico.porcentaje).toBe(100);
    expect(unico.ruta.startsWith('M')).toBe(true);
  });
});

describe('escalarBarras', () => {
  it('escala respecto de la barra más larga e incluye el extra apilado', () => {
    const barras = escalarBarras([
      { etiqueta: 'A', valor: 6, extra: 2 },
      { etiqueta: 'B', valor: 2 },
    ]);

    expect(barras[0].porcentajeValor).toBe(75);
    expect(barras[0].porcentajeExtra).toBe(25);
    expect(barras[1].porcentajeValor).toBe(25);
    expect(barras[1].extra).toBe(0);
  });

  it('todo en cero da 0% y no divide por cero', () => {
    expect(escalarBarras([{ etiqueta: 'A', valor: 0 }])[0].porcentajeValor).toBe(0);
  });
});

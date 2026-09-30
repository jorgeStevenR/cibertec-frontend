import { moverElemento, vecinos } from './orden.util';

describe('moverElemento', () => {
  it('mueve hacia adelante', () => {
    expect(moverElemento(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd']);
  });

  it('mueve hacia atrás', () => {
    expect(moverElemento(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('no modifica la lista original', () => {
    const original = ['a', 'b'];
    moverElemento(original, 0, 1);
    expect(original).toEqual(['a', 'b']);
  });

  it('ignora índices fuera de rango o iguales', () => {
    expect(moverElemento(['a', 'b'], 0, 5)).toEqual(['a', 'b']);
    expect(moverElemento(['a', 'b'], -1, 0)).toEqual(['a', 'b']);
    expect(moverElemento(['a', 'b'], 1, 1)).toEqual(['a', 'b']);
  });
});

describe('vecinos', () => {
  const lista = [{ id: 10 }, { id: 20 }, { id: 30 }];

  it('devuelve anterior y siguiente en el medio', () => {
    expect(vecinos(lista, 20)).toEqual({ anterior: { id: 10 }, siguiente: { id: 30 } });
  });

  it('null en los extremos', () => {
    expect(vecinos(lista, 10).anterior).toBeNull();
    expect(vecinos(lista, 30).siguiente).toBeNull();
  });

  it('ambos null si el id no está', () => {
    expect(vecinos(lista, 99)).toEqual({ anterior: null, siguiente: null });
  });
});

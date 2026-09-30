import { aplanarArbol, armarArbolModulos, idsDelGrupo, moverModulo, NodoModulo } from './modulo-arbol.util';

const m = (id: number, orden: number, moduloPadreId: number | null = null): NodoModulo => ({ id, orden, moduloPadreId });

// General(1) | Corte(2) > [Inicio(3), Semana(4)] | Otro(5)
const base = [m(4, 2, 2), m(1, 1), m(3, 1, 2), m(5, 3), m(2, 2)];

describe('armarArbolModulos', () => {
  it('agrupa raíces con sus hijos, ordenados', () => {
    const arbol = armarArbolModulos(base);
    expect(arbol.map((r) => r.modulo.id)).toEqual([1, 2, 5]);
    expect(arbol[1].hijos.map((h) => h.id)).toEqual([3, 4]);
    expect(arbol[0].hijos).toEqual([]);
  });

  it('trata como raíz a un hijo cuyo padre no vino en la lista', () => {
    const arbol = armarArbolModulos([m(1, 1), m(9, 2, 99)]);
    expect(arbol.map((r) => r.modulo.id)).toEqual([1, 9]);
  });
});

describe('aplanarArbol', () => {
  it('devuelve cada raíz seguida de sus hijos', () => {
    expect(aplanarArbol(armarArbolModulos(base)).map((x) => x.id)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('idsDelGrupo', () => {
  it('lista hermanos en orden', () => {
    expect(idsDelGrupo(base, null)).toEqual([1, 2, 5]);
    expect(idsDelGrupo(base, 2)).toEqual([3, 4]);
  });
});

describe('moverModulo', () => {
  it('reordena entre hermanos', () => {
    const r = moverModulo(base, 5, null, 0);
    expect(idsDelGrupo(r, null)).toEqual([5, 1, 2]);
  });

  it('mueve de raíz a submódulo (al final) y renumera la raíz', () => {
    const r = moverModulo(base, 5, 2);
    expect(idsDelGrupo(r, 2)).toEqual([3, 4, 5]);
    expect(r.find((x) => x.id === 5)?.moduloPadreId).toBe(2);
    expect(r.filter((x) => x.moduloPadreId === null).map((x) => x.orden).sort()).toEqual([1, 2]);
  });

  it('mueve de submódulo a raíz en una posición', () => {
    const r = moverModulo(base, 3, null, 1);
    expect(idsDelGrupo(r, null)).toEqual([1, 3, 2, 5]);
    expect(idsDelGrupo(r, 2)).toEqual([4]);
  });

  it('no modifica la lista original', () => {
    const copia = base.map((x) => ({ ...x }));
    moverModulo(base, 5, 2);
    expect(base).toEqual(copia);
  });
});

/** Lo mínimo que hace falta de un módulo para ubicarlo en el árbol. */
export interface NodoModulo {
  id: number;
  orden: number;
  moduloPadreId: number | null;
}

export interface RamaModulo<T> {
  modulo: T;
  hijos: T[];
}

/**
 * Agrupa la lista plana de módulos (como la devuelve el backend) en raíces con
 * sus submódulos, cada grupo ordenado por `orden`. Un hijo cuyo padre no está
 * en la lista se trata como raíz, para no perderlo de vista.
 */
export function armarArbolModulos<T extends NodoModulo>(modulos: readonly T[]): RamaModulo<T>[] {
  const porOrden = (a: T, b: T) => a.orden - b.orden;
  const ids = new Set(modulos.map((m) => m.id));
  const esRaiz = (m: T) => m.moduloPadreId === null || !ids.has(m.moduloPadreId);
  return modulos
    .filter(esRaiz)
    .sort(porOrden)
    .map((raiz) => ({
      modulo: raiz,
      hijos: modulos.filter((m) => m.moduloPadreId === raiz.id).sort(porOrden),
    }));
}

/** Orden de lectura del curso: cada raíz seguida de sus submódulos. */
export function aplanarArbol<T>(arbol: readonly RamaModulo<T>[]): T[] {
  return arbol.flatMap((rama) => [rama.modulo, ...rama.hijos]);
}

/** Ids de los hermanos de un grupo (null = raíces), en orden. */
export function idsDelGrupo<T extends NodoModulo>(modulos: readonly T[], moduloPadreId: number | null): number[] {
  return modulos
    .filter((m) => m.moduloPadreId === moduloPadreId)
    .sort((a, b) => a.orden - b.orden)
    .map((m) => m.id);
}

/**
 * Aplica un movimiento de forma local (para mostrarlo al instante): mueve
 * `moduloId` al grupo `nuevoPadreId`, en la posición `indice` (se agrega al
 * final si no se indica), y renumera `orden` 1..n en los grupos afectados.
 * Devuelve una lista nueva; no valida reglas de anidamiento (eso lo hace el backend).
 */
export function moverModulo<T extends NodoModulo>(
  modulos: readonly T[],
  moduloId: number,
  nuevoPadreId: number | null,
  indice?: number,
): T[] {
  const movido = modulos.find((m) => m.id === moduloId);
  if (!movido) {
    return [...modulos];
  }
  const padreAnterior = movido.moduloPadreId;
  const destino = idsDelGrupo(modulos, nuevoPadreId).filter((id) => id !== moduloId);
  const posicion = indice === undefined ? destino.length : Math.max(0, Math.min(indice, destino.length));
  destino.splice(posicion, 0, moduloId);
  const origen = idsDelGrupo(modulos, padreAnterior).filter((id) => id !== moduloId);

  return modulos.map((m) => {
    const enDestino = destino.indexOf(m.id);
    if (enDestino !== -1) {
      return { ...m, moduloPadreId: nuevoPadreId, orden: enDestino + 1 };
    }
    const enOrigen = origen.indexOf(m.id);
    if (padreAnterior !== nuevoPadreId && enOrigen !== -1) {
      return { ...m, orden: enOrigen + 1 };
    }
    return m;
  });
}

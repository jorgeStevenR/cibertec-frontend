/**
 * Devuelve una copia de `lista` con el elemento de `desde` movido a `hasta`.
 * Índices fuera de rango o iguales devuelven la lista sin cambios (copia).
 */
export function moverElemento<T>(lista: readonly T[], desde: number, hasta: number): T[] {
  const copia = [...lista];
  if (desde === hasta || desde < 0 || hasta < 0 || desde >= copia.length || hasta >= copia.length) {
    return copia;
  }
  const [movido] = copia.splice(desde, 1);
  copia.splice(hasta, 0, movido);
  return copia;
}

/** Elementos anterior y siguiente al de `id` (null en los extremos o si no está). */
export function vecinos<T extends { id: number }>(
  lista: readonly T[],
  id: number,
): { anterior: T | null; siguiente: T | null } {
  const i = lista.findIndex((e) => e.id === id);
  if (i === -1) {
    return { anterior: null, siguiente: null };
  }
  return {
    anterior: i > 0 ? lista[i - 1] : null,
    siguiente: i < lista.length - 1 ? lista[i + 1] : null,
  };
}

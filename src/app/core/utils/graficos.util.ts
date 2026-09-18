import { parsearFecha } from './calendario.util';

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// Familia azul institucional + un gris; se reparte en orden entre los segmentos de una dona.
export const PALETA_GRAFICOS = ['#1877f2', '#0c2b6b', '#5aa3f5', '#9bb4d8', '#c9d3e3'];

export interface MesGrafico {
  anio: number;
  mes: number;
  etiqueta: string;
}

export interface PuntoGrafico {
  etiqueta: string;
  valor: number;
}

export interface Margen {
  izq: number;
  der: number;
  arr: number;
  aba: number;
}

export interface PuntoEscalado {
  x: number;
  y: number;
}

export interface SegmentoDona {
  etiqueta: string;
  valor: number;
  color: string;
}

export interface ArcoDona extends SegmentoDona {
  porcentaje: number;
  ruta: string;
}

export interface ItemBarra {
  etiqueta: string;
  valor: number;
  extra?: number;
}

export interface BarraEscalada {
  etiqueta: string;
  valor: number;
  extra: number;
  porcentajeValor: number;
  porcentajeExtra: number;
}

const redondear = (n: number): number => Math.round(n * 100) / 100;

// Los últimos `cantidad` meses, del más antiguo al más reciente, terminando en el mes de `hasta`.
export function ultimosMeses(cantidad: number, hasta: Date): MesGrafico[] {
  const meses: MesGrafico[] = [];
  for (let i = cantidad - 1; i >= 0; i--) {
    const fecha = new Date(hasta.getFullYear(), hasta.getMonth() - i, 1);
    meses.push({ anio: fecha.getFullYear(), mes: fecha.getMonth(), etiqueta: MESES_CORTOS[fecha.getMonth()] });
  }
  return meses;
}

export function contarPorMes(fechas: string[], meses: MesGrafico[]): number[] {
  const conteo = meses.map(() => 0);
  for (const texto of fechas) {
    const fecha = parsearFecha(texto);
    if (Number.isNaN(fecha.getTime())) {
      continue;
    }
    const indice = meses.findIndex((m) => m.anio === fecha.getFullYear() && m.mes === fecha.getMonth());
    if (indice >= 0) {
      conteo[indice]++;
    }
  }
  return conteo;
}

// Techo "redondo" del eje vertical: 5 como mínimo y luego múltiplos de la magnitud del máximo.
export function techoEscala(maximo: number): number {
  if (maximo <= 5) {
    return 5;
  }
  const magnitud = Math.pow(10, Math.floor(Math.log10(maximo)));
  return Math.ceil(maximo / magnitud) * magnitud;
}

export function escalarPuntos(valores: number[], ancho: number, alto: number, margen: Margen): PuntoEscalado[] {
  const techo = techoEscala(Math.max(0, ...valores));
  const areaAncho = ancho - margen.izq - margen.der;
  const areaAlto = alto - margen.arr - margen.aba;

  return valores.map((valor, i) => ({
    x: redondear(valores.length === 1 ? margen.izq + areaAncho / 2 : margen.izq + (areaAncho * i) / (valores.length - 1)),
    y: redondear(margen.arr + areaAlto - (valor / techo) * areaAlto),
  }));
}

export function rutaLinea(puntos: PuntoEscalado[]): string {
  return puntos.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ');
}

export function rutaArea(puntos: PuntoEscalado[], yBase: number): string {
  if (puntos.length === 0) {
    return '';
  }
  const ultimo = puntos[puntos.length - 1];
  return `${rutaLinea(puntos)} L${ultimo.x} ${yBase} L${puntos[0].x} ${yBase} Z`;
}

// Arcos de una dona que arranca arriba y avanza en sentido horario. Los segmentos en cero se omiten.
export function arcosDona(
  segmentos: SegmentoDona[],
  cx: number,
  cy: number,
  radioExterior: number,
  radioInterior: number,
): ArcoDona[] {
  const total = segmentos.reduce((suma, s) => suma + Math.max(0, s.valor), 0);
  if (total === 0) {
    return [];
  }

  const punto = (radio: number, angulo: number) => ({
    x: redondear(cx + radio * Math.cos(angulo)),
    y: redondear(cy + radio * Math.sin(angulo)),
  });

  let inicio = -Math.PI / 2;
  const arcos: ArcoDona[] = [];

  for (const segmento of segmentos) {
    if (segmento.valor <= 0) {
      continue;
    }
    // Un solo segmento al 100% necesitaría un arco de 360°, que SVG no dibuja: se recorta apenas.
    const fraccion = Math.min(segmento.valor / total, 0.9999);
    const fin = inicio + fraccion * 2 * Math.PI;
    const grande = fraccion > 0.5 ? 1 : 0;

    const e0 = punto(radioExterior, inicio);
    const e1 = punto(radioExterior, fin);
    const i1 = punto(radioInterior, fin);
    const i0 = punto(radioInterior, inicio);

    arcos.push({
      ...segmento,
      porcentaje: Math.round((segmento.valor / total) * 100),
      ruta:
        `M${e0.x} ${e0.y} A${radioExterior} ${radioExterior} 0 ${grande} 1 ${e1.x} ${e1.y} ` +
        `L${i1.x} ${i1.y} A${radioInterior} ${radioInterior} 0 ${grande} 0 ${i0.x} ${i0.y} Z`,
    });
    inicio = fin;
  }

  return arcos;
}

// Anchos relativos (0-100) respecto de la barra más larga; `extra` se apila después de `valor`.
export function escalarBarras(items: ItemBarra[]): BarraEscalada[] {
  const maximo = Math.max(0, ...items.map((i) => i.valor + (i.extra ?? 0)));
  const porcentaje = (n: number) => (maximo === 0 ? 0 : redondear((n / maximo) * 100));

  return items.map((i) => ({
    etiqueta: i.etiqueta,
    valor: i.valor,
    extra: i.extra ?? 0,
    porcentajeValor: porcentaje(i.valor),
    porcentajeExtra: porcentaje(i.extra ?? 0),
  }));
}

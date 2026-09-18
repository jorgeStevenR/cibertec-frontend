import { Curso } from '../models/curso.model';
import { Rol, Usuario } from '../models/usuario.model';
import { parsearFecha } from './calendario.util';
import { contarPorMes, PuntoGrafico, ultimosMeses } from './graficos.util';
import { ROL_LABELS } from './labels.util';

const ORDEN_ROLES: Rol[] = ['ESTUDIANTE', 'PROFESOR', 'ADMINISTRADOR', 'GESTOR_USUARIOS'];

export const COLOR_ROL: Record<Rol, string> = {
  ESTUDIANTE: '#1877f2',
  PROFESOR: '#0c2b6b',
  ADMINISTRADOR: '#5aa3f5',
  GESTOR_USUARIOS: '#9bb4d8',
};

// Los listados del backend se piden en una sola página de este tamaño para armar los resúmenes.
export const TAMANO_MUESTRA_RESUMEN = 500;

export interface ConteoRol {
  rol: Rol;
  etiqueta: string;
  total: number;
  activos: number;
  inactivos: number;
}

export interface ResumenUsuarios {
  total: number;
  activos: number;
  inactivos: number;
  porRol: ConteoRol[];
  altasPorMes: PuntoGrafico[];
  ultimos: Usuario[];
}

export interface ResumenCursos {
  total: number;
  publicados: number;
  borradores: number;
  porPrograma: PuntoGrafico[];
  ultimos: Curso[];
}

const porFechaDescendente = <T extends { fechaCreacion: string }>(a: T, b: T): number =>
  parsearFecha(b.fechaCreacion).getTime() - parsearFecha(a.fechaCreacion).getTime();

export function resumirUsuarios(usuarios: Usuario[], hoy: Date, meses = 6, limiteUltimos = 5): ResumenUsuarios {
  const porRol: ConteoRol[] = ORDEN_ROLES.map((rol) => {
    const delRol = usuarios.filter((u) => u.rol === rol);
    const activos = delRol.filter((u) => u.activo).length;
    return { rol, etiqueta: ROL_LABELS[rol], total: delRol.length, activos, inactivos: delRol.length - activos };
  });

  const activos = usuarios.filter((u) => u.activo).length;
  const rango = ultimosMeses(meses, hoy);
  const conteo = contarPorMes(
    usuarios.map((u) => u.fechaCreacion),
    rango,
  );

  return {
    total: usuarios.length,
    activos,
    inactivos: usuarios.length - activos,
    porRol,
    altasPorMes: rango.map((m, i) => ({ etiqueta: m.etiqueta, valor: conteo[i] })),
    ultimos: [...usuarios].sort(porFechaDescendente).slice(0, limiteUltimos),
  };
}

export function resumirCursos(cursos: Curso[], limitePrograma = 6, limiteUltimos = 5): ResumenCursos {
  const conteoPrograma = new Map<string, number>();
  for (const curso of cursos) {
    const nombre = curso.programaNombre ?? 'Sin programa';
    conteoPrograma.set(nombre, (conteoPrograma.get(nombre) ?? 0) + 1);
  }

  const publicados = cursos.filter((c) => c.publicado).length;

  return {
    total: cursos.length,
    publicados,
    borradores: cursos.length - publicados,
    porPrograma: [...conteoPrograma.entries()]
      .map(([etiqueta, valor]) => ({ etiqueta, valor }))
      .sort((a, b) => b.valor - a.valor || a.etiqueta.localeCompare(b.etiqueta))
      .slice(0, limitePrograma),
    ultimos: [...cursos].sort(porFechaDescendente).slice(0, limiteUltimos),
  };
}

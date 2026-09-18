import { Curso } from '../models/curso.model';
import { Rol, Usuario } from '../models/usuario.model';
import { resumirCursos, resumirUsuarios } from './resumen.util';

const usuario = (id: number, rol: Rol, activo: boolean, fechaCreacion: string): Usuario => ({
  id,
  nombre: `N${id}`,
  apellido: `A${id}`,
  email: `u${id}@test.com`,
  rol,
  activo,
  fechaCreacion,
});

const curso = (id: number, programaNombre: string | null, publicado: boolean, fechaCreacion: string): Curso => ({
  id,
  titulo: `Curso ${id}`,
  descripcion: '',
  profesorId: 1,
  profesorNombre: null,
  profesorEmail: null,
  programaId: programaNombre ? 1 : null,
  programaNombre,
  publicado,
  fechaCreacion,
  codigo: null,
  periodo: null,
  cupoMaximo: null,
  fechaInicio: null,
  fechaFin: null,
  matriculados: 0,
});

describe('resumirUsuarios', () => {
  const hoy = new Date(2026, 8, 18);
  const usuarios = [
    usuario(1, 'ADMINISTRADOR', true, '2026-01-10T10:00:00'),
    usuario(2, 'ESTUDIANTE', true, '2026-08-05T10:00:00'),
    usuario(3, 'ESTUDIANTE', false, '2026-09-02T10:00:00'),
    usuario(4, 'PROFESOR', true, '2026-09-10T10:00:00'),
  ];

  it('cuenta totales, activos e inactivos', () => {
    const resumen = resumirUsuarios(usuarios, hoy);

    expect(resumen.total).toBe(4);
    expect(resumen.activos).toBe(3);
    expect(resumen.inactivos).toBe(1);
  });

  it('agrupa por rol en un orden estable e incluye los roles sin usuarios', () => {
    const resumen = resumirUsuarios(usuarios, hoy);

    expect(resumen.porRol.map((r) => r.rol)).toEqual(['ESTUDIANTE', 'PROFESOR', 'ADMINISTRADOR', 'GESTOR_USUARIOS']);
    expect(resumen.porRol[0]).toMatchObject({ total: 2, activos: 1, inactivos: 1, etiqueta: 'Estudiante' });
    expect(resumen.porRol[3].total).toBe(0);
  });

  it('cuenta las altas de los últimos 6 meses (las anteriores no entran)', () => {
    const resumen = resumirUsuarios(usuarios, hoy);

    expect(resumen.altasPorMes.map((p) => p.etiqueta)).toEqual(['abr', 'may', 'jun', 'jul', 'ago', 'sep']);
    expect(resumen.altasPorMes.map((p) => p.valor)).toEqual([0, 0, 0, 0, 1, 2]);
  });

  it('devuelve los últimos creados, del más reciente al más antiguo', () => {
    expect(resumirUsuarios(usuarios, hoy, 6, 2).ultimos.map((u) => u.id)).toEqual([4, 3]);
  });

  it('con una lista vacía no falla', () => {
    const resumen = resumirUsuarios([], hoy);

    expect(resumen.total).toBe(0);
    expect(resumen.ultimos).toEqual([]);
  });
});

describe('resumirCursos', () => {
  const cursos = [
    curso(1, 'Software', true, '2026-09-01T10:00:00'),
    curso(2, 'Software', false, '2026-09-05T10:00:00'),
    curso(3, 'Redes', true, '2026-08-01T10:00:00'),
    curso(4, null, true, '2026-09-10T10:00:00'),
  ];

  it('cuenta publicados y borradores', () => {
    const resumen = resumirCursos(cursos);

    expect(resumen.total).toBe(4);
    expect(resumen.publicados).toBe(3);
    expect(resumen.borradores).toBe(1);
  });

  it('agrupa por programa de mayor a menor y rotula los que no tienen', () => {
    const resumen = resumirCursos(cursos);

    expect(resumen.porPrograma[0]).toEqual({ etiqueta: 'Software', valor: 2 });
    expect(resumen.porPrograma.map((p) => p.etiqueta)).toContain('Sin programa');
  });

  it('respeta el límite de programas y de últimos cursos', () => {
    const resumen = resumirCursos(cursos, 1, 2);

    expect(resumen.porPrograma.length).toBe(1);
    expect(resumen.ultimos.map((c) => c.id)).toEqual([4, 2]);
  });
});

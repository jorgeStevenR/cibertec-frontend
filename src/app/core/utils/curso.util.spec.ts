import { Curso } from '../models/curso.model';
import { formatearFechaCalendario } from './calendario.util';
import {
  PATRON_PERIODO,
  campoDeMensajeCurso,
  datosAcademicosCompletos,
  estadoCupo,
  formatearRangoFechas,
  rangoFechasValido,
  textoCupo,
} from './curso.util';

describe('estadoCupo', () => {
  it('sin cupo máximo no hay límite', () => {
    expect(estadoCupo(12, null)).toBe('sin-limite');
  });

  it('marca casi lleno cuando queda un solo lugar', () => {
    expect(estadoCupo(3, 4)).toBe('casi-lleno');
  });

  it('marca lleno cuando se alcanza o se supera el cupo', () => {
    expect(estadoCupo(2, 2)).toBe('lleno');
    expect(estadoCupo(5, 4)).toBe('lleno');
  });

  it('con más de un lugar libre está disponible', () => {
    expect(estadoCupo(1, 10)).toBe('disponible');
    expect(estadoCupo(0, 30)).toBe('disponible');
  });
});

describe('textoCupo', () => {
  it('muestra matriculados / cupo', () => {
    expect(textoCupo(3, 4)).toBe('3 / 4');
  });

  it('sin límite muestra los matriculados en singular o plural', () => {
    expect(textoCupo(1, null)).toBe('1 matriculado · sin límite');
    expect(textoCupo(0, null)).toBe('0 matriculados · sin límite');
  });
});

describe('PATRON_PERIODO', () => {
  it('acepta AAAA-N', () => {
    expect(PATRON_PERIODO.test('2026-2')).toBe(true);
    expect(PATRON_PERIODO.test('2026-10')).toBe(true);
  });

  it('rechaza otros formatos', () => {
    expect(PATRON_PERIODO.test('2026/2')).toBe(false);
    expect(PATRON_PERIODO.test('26-2')).toBe(false);
    expect(PATRON_PERIODO.test('2026-')).toBe(false);
    expect(PATRON_PERIODO.test(' 2026-2')).toBe(false);
  });
});

describe('rangoFechasValido', () => {
  it('acepta fin igual o posterior a inicio', () => {
    expect(rangoFechasValido('2026-08-03', '2026-12-11')).toBe(true);
    expect(rangoFechasValido('2026-08-03', '2026-08-03')).toBe(true);
  });

  it('rechaza fin anterior a inicio', () => {
    expect(rangoFechasValido('2026-12-11', '2026-08-03')).toBe(false);
  });

  it('no compara si falta alguna fecha', () => {
    expect(rangoFechasValido('', '2026-08-03')).toBe(true);
    expect(rangoFechasValido('2026-08-03', null)).toBe(true);
  });
});

describe('formatearFechaCalendario', () => {
  it('conserva el día del texto, sin correrlo por zona horaria', () => {
    expect(formatearFechaCalendario('2026-08-03')).toBe('3 ago 2026');
    expect(formatearFechaCalendario('2026-01-01')).toBe('1 ene 2026');
    expect(formatearFechaCalendario('2026-12-31')).toBe('31 dic 2026');
  });

  it('muestra un guion si no hay fecha', () => {
    expect(formatearFechaCalendario(null)).toBe('—');
  });

  it('devuelve el texto original si no es una fecha de calendario', () => {
    expect(formatearFechaCalendario('pronto')).toBe('pronto');
  });
});

describe('formatearRangoFechas', () => {
  it('muestra el rango completo', () => {
    expect(formatearRangoFechas('2026-08-03', '2026-12-11')).toBe('3 ago 2026 – 11 dic 2026');
  });

  it('muestra solo el extremo que existe', () => {
    expect(formatearRangoFechas('2026-08-03', null)).toBe('Desde 3 ago 2026');
    expect(formatearRangoFechas(null, '2026-12-11')).toBe('Hasta 11 dic 2026');
  });

  it('muestra un guion si no hay ninguna', () => {
    expect(formatearRangoFechas(null, null)).toBe('—');
  });
});

describe('campoDeMensajeCurso', () => {
  it('reconoce el código duplicado', () => {
    expect(campoDeMensajeCurso('Ya existe un curso con el código WFS-2026-B')).toBe('codigo');
  });

  it('reconoce el error de rango como de la fecha de fin', () => {
    expect(campoDeMensajeCurso('La fecha de fin no puede ser anterior a la de inicio')).toBe('fechaFin');
  });

  it('reconoce los obligatorios del PUT', () => {
    expect(campoDeMensajeCurso('El código es obligatorio')).toBe('codigo');
    expect(campoDeMensajeCurso('El período es obligatorio')).toBe('periodo');
    expect(campoDeMensajeCurso('La fecha de inicio es obligatoria')).toBe('fechaInicio');
    expect(campoDeMensajeCurso('La fecha de fin es obligatoria')).toBe('fechaFin');
  });

  it('reconoce la reducción de cupo', () => {
    expect(
      campoDeMensajeCurso('No se puede reducir el cupo máximo a 2: el curso ya tiene 3 estudiantes matriculados'),
    ).toBe('cupoMaximo');
  });

  it('deja sin campo los mensajes genéricos', () => {
    expect(campoDeMensajeCurso('No tienes permiso para realizar esta acción')).toBeNull();
    expect(campoDeMensajeCurso('Uno o más campos no son válidos')).toBeNull();
  });
});

describe('datosAcademicosCompletos', () => {
  const base: Curso = {
    id: 1,
    titulo: 'Curso',
    descripcion: '',
    profesorId: 1,
    profesorNombre: null,
    profesorEmail: null,
    programaId: 1,
    programaNombre: null,
    publicado: true,
    fechaCreacion: '2026-01-01T00:00:00',
    codigo: 'ABC-1',
    periodo: '2026-1',
    cupoMaximo: null,
    fechaInicio: '2026-02-01',
    fechaFin: '2026-06-01',
    matriculados: 0,
  };

  it('es true con código, período y fechas', () => {
    expect(datosAcademicosCompletos(base)).toBe(true);
  });

  it('es false en un curso antiguo con esos datos en null', () => {
    expect(datosAcademicosCompletos({ ...base, codigo: null, periodo: null, fechaInicio: null, fechaFin: null })).toBe(false);
    expect(datosAcademicosCompletos({ ...base, fechaFin: null })).toBe(false);
  });

  it('el cupo vacío no cuenta como dato faltante', () => {
    expect(datosAcademicosCompletos({ ...base, cupoMaximo: null })).toBe(true);
  });
});

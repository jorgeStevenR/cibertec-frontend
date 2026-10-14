import { FormArray, FormControl, FormGroup } from '@angular/forms';
import { Cuestionario, IntentoDetalle } from '../models/cuestionario.model';
import {
  construirPreguntaRequest,
  correctaValidator,
  estadoCuestionarioEstudiante,
  leerPuntaje,
  reindexarCorrecta,
} from './cuestionario.util';

const cuestionario = (disponible?: boolean | null): Cuestionario => ({
  id: 1,
  moduloId: 1,
  titulo: 'Quiz',
  descripcion: '',
  fechaApertura: null,
  fechaEntrega: null,
  tiempoLimiteMinutos: null,
  puntajeMaximo: 10,
  fechaCreacion: '2026-09-01T10:00:00',
  disponible,
});

const intento: IntentoDetalle = {
  id: 7,
  cuestionarioId: 1,
  estudianteId: 3,
  estudianteNombre: null,
  estudianteEmail: null,
  nota: 8,
  puntajeMaximo: 10,
  estado: 'CALIFICADO',
  fechaEntrega: '2026-09-02T10:00:00',
  preguntas: [],
};

describe('correctaValidator', () => {
  const grupo = (cantidadOpciones: number, correcta: number | null) =>
    new FormGroup(
      {
        opciones: new FormArray(Array.from({ length: cantidadOpciones }, () => new FormControl(''))),
        correcta: new FormControl<number | null>(correcta),
      },
      { validators: correctaValidator() },
    );

  it('es válido si la correcta apunta a una opción existente', () => {
    expect(grupo(3, 2).errors).toBeNull();
  });

  it('marca error si no hay correcta', () => {
    expect(grupo(3, null).errors).toEqual({ sinCorrecta: true });
  });

  it('marca error si el índice quedó fuera de rango', () => {
    expect(grupo(2, 2).errors).toEqual({ sinCorrecta: true });
  });

  it('no exige correcta en una pregunta abierta', () => {
    const abierta = new FormGroup(
      {
        tipo: new FormControl('ABIERTA'),
        opciones: new FormArray<FormControl<string | null>>([]),
        correcta: new FormControl<number | null>(null),
      },
      { validators: correctaValidator() },
    );
    expect(abierta.errors).toBeNull();
  });
});

describe('construirPreguntaRequest', () => {
  it('recorta textos, convierte el puntaje y marca solo la correcta', () => {
    const req = construirPreguntaRequest({
      tipo: 'OPCION_MULTIPLE',
      enunciado: '  ¿2+2?  ',
      puntaje: 3,
      opciones: [
        { id: 10, texto: ' 3 ' },
        { id: null, texto: '4' },
      ],
      correcta: 1,
    });
    expect(req).toEqual({
      tipo: 'OPCION_MULTIPLE',
      enunciado: '¿2+2?',
      puntaje: 3,
      opciones: [
        { id: 10, texto: '3', esCorrecta: false },
        { texto: '4', esCorrecta: true },
      ],
    });
  });

  it('no manda "id" en opciones nuevas', () => {
    const req = construirPreguntaRequest({
      tipo: 'OPCION_MULTIPLE',
      enunciado: 'x',
      puntaje: 1,
      opciones: [{ id: null, texto: 'a' }],
      correcta: 0,
    });
    expect('id' in req.opciones[0]).toBe(false);
  });

  it('verdadero/falso manda sus dos opciones con la correcta marcada', () => {
    const req = construirPreguntaRequest({
      tipo: 'VERDADERO_FALSO',
      enunciado: 'Java es compilado',
      puntaje: 1,
      opciones: [
        { id: null, texto: 'Verdadero' },
        { id: null, texto: 'Falso' },
      ],
      correcta: 1,
    });
    expect(req.opciones).toEqual([
      { texto: 'Verdadero', esCorrecta: false },
      { texto: 'Falso', esCorrecta: true },
    ]);
  });

  it('una abierta va sin opciones aunque el formulario haya quedado con alguna', () => {
    const req = construirPreguntaRequest({
      tipo: 'ABIERTA',
      enunciado: 'Explica qué es una API',
      puntaje: 2,
      opciones: [{ id: null, texto: 'resto de otro tipo' }],
      correcta: 0,
    });
    expect(req).toEqual({ tipo: 'ABIERTA', enunciado: 'Explica qué es una API', puntaje: 2, opciones: [] });
  });
});

describe('leerPuntaje', () => {
  it('acepta punto o coma decimal', () => {
    expect(leerPuntaje('0.5')).toBe(0.5);
    expect(leerPuntaje(' 0,75 ')).toBe(0.75);
    expect(leerPuntaje('2')).toBe(2);
  });

  it('null si está vacío o no es un número', () => {
    expect(leerPuntaje('')).toBeNull();
    expect(leerPuntaje('   ')).toBeNull();
    expect(leerPuntaje('abc')).toBeNull();
  });
});

describe('reindexarCorrecta', () => {
  it('queda en null si se quita la opción correcta', () => {
    expect(reindexarCorrecta(1, 1)).toBeNull();
  });

  it('baja uno si se quita una opción anterior', () => {
    expect(reindexarCorrecta(2, 0)).toBe(1);
  });

  it('no cambia si se quita una opción posterior', () => {
    expect(reindexarCorrecta(0, 2)).toBe(0);
  });

  it('sigue en null si no había correcta', () => {
    expect(reindexarCorrecta(null, 0)).toBeNull();
  });
});

describe('estadoCuestionarioEstudiante', () => {
  it('respondido gana sobre cualquier disponibilidad', () => {
    expect(estadoCuestionarioEstudiante(cuestionario(false), intento)).toEqual({
      tipo: 'respondido',
      nota: 8,
      puntajeMaximo: 10,
    });
  });

  it('en revisión si el intento llegó sin nota (abiertas sin calificar)', () => {
    expect(estadoCuestionarioEstudiante(cuestionario(true), { ...intento, nota: null, estado: 'PENDIENTE_REVISION' })).toEqual({
      tipo: 'en-revision',
    });
  });

  it('no disponible solo con un false explícito', () => {
    expect(estadoCuestionarioEstudiante(cuestionario(false), null)).toEqual({ tipo: 'no-disponible' });
  });

  it('pendiente cuando se consultó y no hay intento (disponible ausente = fail-open)', () => {
    expect(estadoCuestionarioEstudiante(cuestionario(undefined), null)).toEqual({ tipo: 'pendiente' });
    expect(estadoCuestionarioEstudiante(cuestionario(null), null)).toEqual({ tipo: 'pendiente' });
  });

  it('desconocido si todavía no se consultó el intento', () => {
    expect(estadoCuestionarioEstudiante(cuestionario(true), undefined)).toEqual({ tipo: 'desconocido' });
  });
});

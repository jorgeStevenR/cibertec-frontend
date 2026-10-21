import { FormArray, FormControl, FormGroup } from '@angular/forms';
import { Cuestionario, IntentoDetalle, PreguntaConRespuesta } from '../models/cuestionario.model';
import {
  construirPreguntaRequest,
  correctaValidator,
  estadoCuestionarioEstudiante,
  estaRespondida,
  leerPuntaje,
  reindexarCorrecta,
  resultadoIntentoEstudiante,
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
  mostrarNota: true,
});

const pregunta: PreguntaConRespuesta = {
  id: 1,
  tipo: 'OPCION_MULTIPLE',
  enunciado: '¿?',
  puntaje: 10,
  orden: 0,
  opciones: [],
  opcionElegidaId: null,
  textoRespuesta: null,
  puntajeObtenido: null,
};

const intento: IntentoDetalle = {
  id: 7,
  cuestionarioId: 1,
  estudianteId: 3,
  estudianteNombre: null,
  estudianteEmail: null,
  nota: 8,
  puntajeMaximo: 10,
  notaSobre5: 4,
  notaVisible: true,
  estado: 'CALIFICADO',
  fechaEntrega: '2026-09-02T10:00:00',
  preguntas: [pregunta],
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

// Lo que manda el backend al estudiante según el caso (ver contrato "Nota sobre 5").
const pendiente: IntentoDetalle = { ...intento, nota: null, notaSobre5: null, notaVisible: false, estado: 'PENDIENTE_REVISION' };
const oculto: IntentoDetalle = { ...intento, nota: null, notaSobre5: null, notaVisible: false, preguntas: [] };

describe('resultadoIntentoEstudiante', () => {
  it('visible con la nota publicada', () => {
    expect(resultadoIntentoEstudiante(intento)).toBe('visible');
  });

  it('en revisión si el profesor muestra notas pero faltan abiertas por calificar', () => {
    expect(resultadoIntentoEstudiante(pendiente)).toBe('en-revision');
  });

  it('oculta si el profesor no muestra la nota (llegan las preguntas vacías)', () => {
    expect(resultadoIntentoEstudiante(oculto)).toBe('oculta');
    expect(resultadoIntentoEstudiante({ ...oculto, estado: 'PENDIENTE_REVISION' })).toBe('oculta');
  });
});

describe('estadoCuestionarioEstudiante', () => {
  it('respondido con la nota sobre 5, gane sobre cualquier disponibilidad', () => {
    expect(estadoCuestionarioEstudiante(cuestionario(false), intento)).toEqual({ tipo: 'respondido', notaSobre5: 4 });
  });

  it('en revisión si faltan abiertas por calificar', () => {
    expect(estadoCuestionarioEstudiante(cuestionario(true), pendiente)).toEqual({ tipo: 'en-revision' });
  });

  it('enviado (sin nota) si el profesor la oculta', () => {
    expect(estadoCuestionarioEstudiante(cuestionario(true), oculto)).toEqual({ tipo: 'enviado' });
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

describe('estaRespondida', () => {
  const cerrada = { id: 1, tipo: 'OPCION_MULTIPLE' as const };
  const abierta = { id: 2, tipo: 'ABIERTA' as const };

  it('una cerrada cuenta si tiene una opción elegida', () => {
    expect(estaRespondida(cerrada, { 1: 10 }, {})).toBe(true);
    expect(estaRespondida(cerrada, {}, {})).toBe(false);
  });

  it('una abierta cuenta solo con texto que no sea espacios', () => {
    expect(estaRespondida(abierta, {}, { 2: 'Mi respuesta' })).toBe(true);
    expect(estaRespondida(abierta, {}, { 2: '   ' })).toBe(false);
    expect(estaRespondida(abierta, {}, {})).toBe(false);
  });
});

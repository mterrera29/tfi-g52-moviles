import type { Aviso } from '../tipos/aviso';
import {
  avisoDesvioVigente,
  filtrarTrazadosAlternativos,
  puntosTrazadoValidos,
} from './trazadoAlternativo';

function aviso(parcial: Partial<Aviso> & Pick<Aviso, 'id'>): Aviso {
  return {
    titulo: 'Desvío de prueba',
    detalle: 'Detalle',
    lineaIds: ['lin-02'],
    desde: '2026-11-01T00:00:00-03:00',
    hasta: null,
    gravedad: 'desvio',
    trazadoAlternativo: [
      { latitud: -31.73, longitud: -60.52 },
      { latitud: -31.74, longitud: -60.53 },
      { latitud: -31.75, longitud: -60.54 },
    ],
    videoUrl: null,
    ...parcial,
  };
}

function igual<T>(obtenido: T, esperado: T, nombre: string) {
  if (obtenido !== esperado) {
    throw new Error(`${nombre}: se esperaba ${String(esperado)} y se obtuvo ${String(obtenido)}`);
  }
}

function test(nombre: string, fn: () => void) {
  fn();
  console.log(`ok  ${nombre}`);
}

const ahora = new Date('2026-11-06T12:00:00-03:00');

test('desvío vigente con geometría válida se dibuja', () => {
  const trazados = filtrarTrazadosAlternativos([aviso({ id: 'avi-1' })], ahora);
  igual(trazados.length, 1, 'cantidad');
  igual(trazados[0].puntos.length, 3, 'puntos');
  igual(trazados[0].id, 'avi-1', 'id');
});

test('desvío vencido no se dibuja', () => {
  const trazados = filtrarTrazadosAlternativos(
    [
      aviso({
        id: 'avi-vencido',
        desde: '2026-11-01T00:00:00-03:00',
        hasta: '2026-11-05T23:59:59-03:00',
      }),
    ],
    ahora,
  );
  igual(trazados.length, 0, 'vencido');
  igual(
    avisoDesvioVigente(
      aviso({
        id: 'avi-vencido',
        hasta: '2026-11-05T23:59:59-03:00',
      }),
      ahora,
    ),
    false,
    'no vigente',
  );
});

test('desvío que todavía no empezó no se dibuja', () => {
  const trazados = filtrarTrazadosAlternativos(
    [aviso({ id: 'avi-futuro', desde: '2026-11-10T00:00:00-03:00' })],
    ahora,
  );
  igual(trazados.length, 0, 'futuro');
});

test('hasta null sigue vigente', () => {
  igual(avisoDesvioVigente(aviso({ id: 'avi-abierto', hasta: null }), ahora), true, 'abierto');
});

test('hasta inválido no se asume vigente', () => {
  igual(
    avisoDesvioVigente(aviso({ id: 'avi-malo', hasta: 'no-es-fecha' }), ahora),
    false,
    'hasta inválido',
  );
});

test('informativo o suspensión no usan el trazado aunque tengan puntos', () => {
  const trazados = filtrarTrazadosAlternativos(
    [
      aviso({ id: 'avi-info', gravedad: 'informativo' }),
      aviso({ id: 'avi-susp', gravedad: 'suspension' }),
    ],
    ahora,
  );
  igual(trazados.length, 0, 'solo desvío');
});

test('sin avisos, trazado null o vacío no rompe', () => {
  igual(filtrarTrazadosAlternativos([], ahora).length, 0, 'vacío');
  igual(filtrarTrazadosAlternativos([aviso({ id: 'n', trazadoAlternativo: null })], ahora).length, 0, 'null');
  igual(filtrarTrazadosAlternativos([aviso({ id: 'v', trazadoAlternativo: [] })], ahora).length, 0, 'array vacío');
});

test('un solo punto o coordenadas inválidas se descartan', () => {
  igual(puntosTrazadoValidos([{ latitud: -31.73, longitud: -60.52 }]).length, 1, 'un punto crudo');
  igual(
    filtrarTrazadosAlternativos(
      [aviso({ id: 'uno', trazadoAlternativo: [{ latitud: -31.73, longitud: -60.52 }] })],
      ahora,
    ).length,
    0,
    'polyline pide 2 puntos',
  );
  igual(
    filtrarTrazadosAlternativos(
      [
        aviso({
          id: 'malos',
          trazadoAlternativo: [
            { latitud: 999, longitud: -60.52 },
            { latitud: -31.73, longitud: 200 },
            { latitud: Number.NaN, longitud: -60.5 },
          ],
        }),
      ],
      ahora,
    ).length,
    0,
    'inválidos',
  );
});

test('válido→inválido→válido rechaza el trazado entero y no une los buenos', () => {
  const puntos = [
    { latitud: -31.73, longitud: -60.52 },
    { latitud: 999, longitud: -60.53 },
    { latitud: -31.75, longitud: -60.54 },
  ];
  igual(puntosTrazadoValidos(puntos).length, 0, 'no quedan puntos sueltos');
  igual(
    filtrarTrazadosAlternativos([aviso({ id: 'avi-roto', trazadoAlternativo: puntos })], ahora).length,
    0,
    'no se dibuja',
  );
});

test('varios desvíos vigentes se dibujan por separado', () => {
  const trazados = filtrarTrazadosAlternativos(
    [
      aviso({ id: 'avi-a' }),
      aviso({
        id: 'avi-b',
        trazadoAlternativo: [
          { latitud: -31.71, longitud: -60.51 },
          { latitud: -31.72, longitud: -60.515 },
        ],
      }),
    ],
    ahora,
  );
  igual(trazados.length, 2, 'dos trazados');
  igual(trazados[0].id, 'avi-a', 'primero');
  igual(trazados[1].id, 'avi-b', 'segundo');
});

test('puntos válidos se conservan en el orden recibido, sin inventar ruta', () => {
  const puntos = [
    { latitud: -31.73, longitud: -60.52 },
    { latitud: -31.731, longitud: -60.521 },
  ];
  const filtrados = puntosTrazadoValidos(puntos);
  igual(filtrados[0].latitud, -31.73, 'primero');
  igual(filtrados[1].longitud, -60.521, 'segundo');
});

console.log('Todos los casos de trazado alternativo pasaron.');

import {
  actualizarFiltroMagnetico,
  anguloCambioVisible,
  campoMagneticoDudoso,
  convieneMantenerHorizontal,
  coordenadasValidas,
  destinoSigueSiendo,
  diferenciaAngular,
  distanciaEntre,
  faltaSenalOrientacion,
  hayQueInvalidarGps,
  lecturaMagneticaUsable,
  normalizarAngulo,
  posicionGpsConCoordenadas,
  posicionGpsUsable,
  timestampGpsAMs,
  rotacionHaciaDestino,
  rumboGeografico,
  rumboMagnetico,
  suavizarAngulo,
  textoDistancia,
} from './rumboParada';
import { resolverWatchSiVigente } from './suscripcionVigente';
import type { Coordenadas } from '../tipos/linea';

function igual<T>(obtenido: T, esperado: T, nombre: string) {
  if (obtenido !== esperado) {
    throw new Error(`${nombre}: se esperaba ${String(esperado)} y se obtuvo ${String(obtenido)}`);
  }
}

function cerca(obtenido: number | null, esperado: number, nombre: string, tolerancia = 1) {
  if (obtenido === null || !Number.isFinite(obtenido) || Math.abs(obtenido - esperado) > tolerancia) {
    throw new Error(`${nombre}: se esperaba ~${esperado} y se obtuvo ${String(obtenido)}`);
  }
}

const pendientes: Promise<void>[] = [];

function test(nombre: string, fn: () => void | Promise<void>) {
  pendientes.push(
    Promise.resolve()
      .then(fn)
      .then(() => {
        console.log(`ok  ${nombre}`);
      }),
  );
}

const origen: Coordenadas = { latitud: -31.7333, longitud: -60.5297 };

test('rumbo norte (misma longitud, más al norte)', () => {
  cerca(rumboGeografico(origen, { latitud: -31.7233, longitud: -60.5297 }), 0, 'N', 1);
});

test('rumbo este sobre el ecuador', () => {
  cerca(
    rumboGeografico({ latitud: 0, longitud: -60.5 }, { latitud: 0, longitud: -60.4 }),
    90,
    'E',
    1,
  );
});

test('rumbo sur (misma longitud, más al sur)', () => {
  cerca(rumboGeografico(origen, { latitud: -31.7433, longitud: -60.5297 }), 180, 'S', 1);
});

test('rumbo oeste sobre el ecuador', () => {
  cerca(
    rumboGeografico({ latitud: 0, longitud: -60.5 }, { latitud: 0, longitud: -60.6 }),
    270,
    'O',
    1,
  );
});

test('cruce 359/0: diferencia corta, no por el otro lado', () => {
  cerca(diferenciaAngular(359, 1), 2, '359→1');
  cerca(diferenciaAngular(1, 359), -2, '1→359');
  igual(normalizarAngulo(-90), 270, '-90 → 270');
  igual(normalizarAngulo(360), 0, '360 → 0');
  const suave = suavizarAngulo(359, 3, 0.5);
  if (suave > 10 && suave < 350) {
    throw new Error(`suavizado cruzó el 0 por el camino largo: ${suave}`);
  }
  igual(anguloCambioVisible(359, 0.4, 2), false, 'ruido chico no se pinta');
  igual(anguloCambioVisible(359, 8, 2), true, 'salto real sí se pinta');
});

test('misma ubicación o coords inválidas no dan rumbo', () => {
  igual(rumboGeografico(origen, origen), null, 'mismo punto');
  igual(
    rumboGeografico(origen, { latitud: origen.latitud + 0.00005, longitud: origen.longitud }),
    null,
    'muy cerca',
  );
  igual(coordenadasValidas({ latitud: 999, longitud: -60 }), false, 'lat inválida');
  igual(coordenadasValidas({ latitud: -31, longitud: Number.NaN }), false, 'NaN');
  igual(rumboGeografico(origen, { latitud: Number.NaN, longitud: -60.5 }), null, 'destino NaN');
  igual(distanciaEntre(origen, { latitud: 200, longitud: 0 }), null, 'distancia inválida');
});

test('fallos de sensor: cero, no finito, campo nulo', () => {
  igual(lecturaMagneticaUsable({ x: 0, y: 0, z: 0 }), false, 'cero');
  igual(lecturaMagneticaUsable({ x: Number.NaN, y: 20, z: 0 }), false, 'NaN');
  igual(lecturaMagneticaUsable({ x: Number.POSITIVE_INFINITY, y: 1, z: 1 }), false, 'Infinity');
  igual(rumboMagnetico({ x: 0, y: 0, z: 0 }), null, 'rumbo cero');
  igual(rumboMagnetico({ x: Number.NaN, y: 30, z: 0 }), null, 'rumbo NaN');
  igual(campoMagneticoDudoso({ x: 1, y: 1, z: 1 }), true, 'campo débil');
});

test('magnetómetro: norte y este con x/y, sin compensar inclinación', () => {
  cerca(rumboMagnetico({ x: 0, y: 30, z: 2 }), 0, 'top del teléfono al norte magnético');
  cerca(rumboMagnetico({ x: 30, y: 0, z: 2 }), 90, 'top al este magnético');
  const conZGrande = rumboMagnetico({ x: 30, y: 0, z: 80 });
  cerca(conZGrande, 90, 'z grande no rota el rumbo a otra compensación');
  igual(convieneMantenerHorizontal({ x: 5, y: 1, z: 40 }), true, 'consejo horizontal, no medición de postura');
  igual(convieneMantenerHorizontal({ x: 0, y: 30, z: 2 }), false, 'componente horizontal dominante');
});

test('NaN o cero no entra al suavizado y pide invalidar la flecha', () => {
  const previo = { x: 30, y: 0, z: 2 };
  const nan = actualizarFiltroMagnetico(previo, { x: Number.NaN, y: 20, z: 0 });
  igual(nan.suave, null, 'no mezcla NaN');
  igual(nan.rumbo, null, 'sin rumbo');
  igual(nan.invalidarFlecha, true, 'oculta flecha previa');
  const cero = actualizarFiltroMagnetico(previo, { x: 0, y: 0, z: 0 });
  igual(cero.invalidarFlecha, true, 'cero invalida');
  const recupera = actualizarFiltroMagnetico(null, { x: 0, y: 30, z: 2 });
  igual(recupera.invalidarFlecha, false, 'muestra válida recupera');
  cerca(recupera.rumbo, 0, 'rumbo fresco');
});

test('GPS: hay que invalidar si venció la muestra usable', () => {
  igual(hayQueInvalidarGps(null, 10_000), false, 'sin muestra no hay flecha que invalidar');
  igual(hayQueInvalidarGps(1_000, 10_000), false, 'aún vigente');
  igual(hayQueInvalidarGps(1_000, 1_000 + 60_000), true, 'vencida');
});

test('watch diferido: stop y después resolve no deja sub viva', async () => {
  const llamadas: string[] = [];
  let vigente = true;
  let resolver!: (sub: { remove: () => void }) => void;
  const pendiente = new Promise<{ remove: () => void }>((ok) => {
    resolver = ok;
  });
  const trabajo = resolverWatchSiVigente(pendiente, () => vigente);
  vigente = false;
  resolver({
    remove: () => {
      llamadas.push('remove');
    },
  });
  const resultado = await trabajo;
  igual(resultado.sub, null, 'no se adopta');
  igual(resultado.fallo, null, 'no es error de watch');
  igual(llamadas.join(','), 'remove', 'se suelta al instante');
});

test('watch diferido vigente se adopta; el catch no inventa sub', async () => {
  const resultadoOk = await resolverWatchSiVigente(
    Promise.resolve({
      remove: () => {
        throw new Error('no debía removerse');
      },
    }),
    () => true,
  );
  igual(resultadoOk.sub !== null, true, 'adopta');
  const resultadoFail = await resolverWatchSiVigente(Promise.reject(new Error('gps caído')), () => true);
  igual(resultadoFail.sub, null, 'sin sub');
  igual(resultadoFail.fallo instanceof Error, true, 'propaga fallo para soltar mag de ESTA sesión');
});

test('rotación relativa destino vs orientación del teléfono', () => {
  cerca(rotacionHaciaDestino(90, 0) ?? Number.NaN, 90, 'parada al este, teléfono al norte');
  cerca(rotacionHaciaDestino(0, 359) ?? Number.NaN, 1, 'cruce 0 con teléfono en 359');
  igual(rotacionHaciaDestino(Number.NaN, 10), null, 'rumbo inválido');
});

test('timestamp GPS en segundos se normaliza a ms', () => {
  igual(timestampGpsAMs(1_736_000_000), 1_736_000_000_000, 'segundos');
  igual(timestampGpsAMs(1_736_000_000_000), 1_736_000_000_000, 'ya en ms');
  const ahora = 1_736_000_000_500;
  igual(
    posicionGpsUsable({
      latitud: origen.latitud,
      longitud: origen.longitud,
      timestampMs: 1_736_000_000,
      ahoraMs: ahora,
    }),
    true,
    'muestra en segundos sigue fresca',
  );
});

test('última conocida con coords válidas se puede usar aunque no esté fresca', () => {
  igual(
    posicionGpsConCoordenadas({ latitud: origen.latitud, longitud: origen.longitud }),
    true,
    'coords ok',
  );
  igual(
    posicionGpsUsable({
      latitud: origen.latitud,
      longitud: origen.longitud,
      timestampMs: 1_000,
      ahoraMs: 1_000 + 60_000,
    }),
    false,
    'no fresca',
  );
});

test('falta de señal separa GPS y brújula', () => {
  igual(faltaSenalOrientacion(true, true), 'ninguna', 'ambas ok');
  igual(faltaSenalOrientacion(false, true), 'gps', 'falta gps');
  igual(faltaSenalOrientacion(true, false), 'brujula', 'falta mag');
  igual(faltaSenalOrientacion(false, false), 'ambas', 'faltan las dos');
});

test('GPS viejo o inválido no se usa; el destino tiene que coincidir', () => {
  igual(
    posicionGpsUsable({
      latitud: origen.latitud,
      longitud: origen.longitud,
      timestampMs: 1_000,
      ahoraMs: 1_000 + 60_000,
    }),
    false,
    'vieja',
  );
  igual(
    posicionGpsUsable({
      latitud: origen.latitud,
      longitud: origen.longitud,
      timestampMs: 5_000,
      ahoraMs: 10_000,
    }),
    true,
    'fresca',
  );
  igual(destinoSigueSiendo('par-101', 'par-102'), false, 'otra parada');
  igual(destinoSigueSiendo('par-101', 'par-101'), true, 'misma');
});

void Promise.all(pendientes)
  .then(() => {
    console.log('Todos los casos de rumbo a la parada pasaron.');
    console.log(
      'Nota: tests puros y mocks de promesas. No cubren magnetómetro real, GPS, permisos ni teléfono.',
    );
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });

test('texto de distancia en metros, kilómetros y sin ubicación', () => {
  const parada = { latitud: 0, longitud: 0.001 };
  igual(textoDistancia(null, parada), null, 'sin ubicación');
  igual(textoDistancia({ latitud: 0, longitud: 0 }, parada), 'a 110 m', 'metros');
  igual(textoDistancia({ latitud: 0, longitud: 0 }, { latitud: 0, longitud: 0.02 }), 'a 2,2 km', 'km');
});

import {
  MAX_FLECHAS_POR_SENTIDO,
  flechasDeTrazado,
} from './flechasRecorrido';
import type { Coordenadas } from '../tipos/linea';

function igual<T>(obtenido: T, esperado: T, nombre: string) {
  if (obtenido !== esperado) {
    throw new Error(`${nombre}: se esperaba ${String(esperado)} y se obtuvo ${String(obtenido)}`);
  }
}

function casi(obtenido: number, esperado: number, nombre: string, tolerancia = 8) {
  if (Math.abs(obtenido - esperado) > tolerancia) {
    throw new Error(`${nombre}: se esperaba ~${esperado} y se obtuvo ${obtenido}`);
  }
}

function test(nombre: string, fn: () => void) {
  fn();
  console.log(`ok  ${nombre}`);
}

function punto(latitud: number, longitud: number): Coordenadas {
  return { latitud, longitud };
}

function lineaEste(km = 3): Coordenadas[] {
  const pasos = 6;
  return Array.from({ length: pasos + 1 }, (_, i) =>
    punto(-31.73, -60.53 + (km / 111.32) * (i / pasos)),
  );
}

test('sin geometría fiable no inventa flechas', () => {
  igual(flechasDeTrazado([]).length, 0, 'vacío');
  igual(flechasDeTrazado([punto(-31.73, -60.53)]).length, 0, 'un punto');
  igual(
    flechasDeTrazado([punto(-31.73, -60.53), punto(999, -60.53)]).length,
    0,
    'inválido descarta el trazado',
  );
});

test('polilínea demasiado corta no pone flechas', () => {
  igual(
    flechasDeTrazado([punto(-31.73, -60.53), punto(-31.7302, -60.5302)]).length,
    0,
    'corta',
  );
});

test('el rumbo sigue el orden real de puntos, no el inverso', () => {
  const ida = lineaEste(3);
  const vuelta = [...ida].reverse();
  const flechasIda = flechasDeTrazado(ida);
  const flechasVuelta = flechasDeTrazado(vuelta);
  if (flechasIda.length === 0 || flechasVuelta.length === 0) {
    throw new Error('hacía falta al menos una flecha por sentido');
  }
  casi(flechasIda[0].rumbo, 90, 'ida hacia el este');
  casi(flechasVuelta[0].rumbo, 270, 'vuelta hacia el oeste');
});

test('las flechas quedan sobre el segmento, sin desplazar el recorrido', () => {
  const trazado = lineaEste(3);
  const minLon = Math.min(...trazado.map((p) => p.longitud));
  const maxLon = Math.max(...trazado.map((p) => p.longitud));
  const lat = trazado[0].latitud;
  for (const flecha of flechasDeTrazado(trazado)) {
    if (flecha.longitud < minLon - 1e-8 || flecha.longitud > maxLon + 1e-8) {
      throw new Error('flecha fuera del rango de longitudes del trazado');
    }
    casi(flecha.latitud, lat, 'misma latitud del segmento este-oeste', 0.0002);
  }
});

test('no satura: hay un tope y no una flecha por vértice', () => {
  const densa: Coordenadas[] = Array.from({ length: 40 }, (_, i) =>
    punto(-31.73, -60.55 + i * 0.002),
  );
  const flechas = flechasDeTrazado(densa);
  if (flechas.length === 0) throw new Error('con 40 puntos largos tiene que haber flechas');
  if (flechas.length > MAX_FLECHAS_POR_SENTIDO) {
    throw new Error(`demasiadas flechas: ${flechas.length}`);
  }
  if (flechas.length >= densa.length - 1) {
    throw new Error('no debería haber una flecha por cada segmento');
  }
});

test('sentidos opuestos en el mismo corredor no se fusionan', () => {
  const ida = lineaEste(2.5);
  const vuelta = [...ida].reverse();
  const rumbosIda = flechasDeTrazado(ida).map((f) => Math.round(f.rumbo / 10) * 10);
  const rumbosVuelta = flechasDeTrazado(vuelta).map((f) => Math.round(f.rumbo / 10) * 10);
  igual(rumbosIda.every((r) => r === 90), true, 'ida 90');
  igual(rumbosVuelta.every((r) => r === 270), true, 'vuelta 270');
});

console.log('Todos los casos de flechas de recorrido pasaron.');

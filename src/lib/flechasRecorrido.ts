import { puntosTrazadoValidos } from '@/lib/trazadoAlternativo';
import { distanciaEntre, normalizarAngulo } from '@/lib/rumboParada';
import type { Coordenadas } from '@/tipos/linea';

export const METROS_ENTRE_FLECHAS = 550;
export const METROS_MARGEN_EXTREMOS = 90;
export const METROS_SEGMENTO_MINIMO = 8;
export const METROS_TRAZADO_MINIMO = 80;
export const MAX_FLECHAS_POR_SENTIDO = 8;

export type FlechaRecorrido = {
  latitud: number;
  longitud: number;
  rumbo: number;
};

function rumboDelSegmento(origen: Coordenadas, destino: Coordenadas): number | null {
  const phi1 = (origen.latitud * Math.PI) / 180;
  const phi2 = (destino.latitud * Math.PI) / 180;
  const dLambda = ((destino.longitud - origen.longitud) * Math.PI) / 180;
  const y = Math.sin(dLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLambda);
  if (!Number.isFinite(x) || !Number.isFinite(y) || (x === 0 && y === 0)) return null;
  return normalizarAngulo((Math.atan2(y, x) * 180) / Math.PI);
}

function interpolar(origen: Coordenadas, destino: Coordenadas, t: number): Coordenadas {
  return {
    latitud: origen.latitud + (destino.latitud - origen.latitud) * t,
    longitud: origen.longitud + (destino.longitud - origen.longitud) * t,
  };
}

export function flechasDeTrazado(trazado: Coordenadas[]): FlechaRecorrido[] {
  const puntos = puntosTrazadoValidos(trazado);
  if (puntos.length < 2) return [];

  const segmentos: Array<{
    origen: Coordenadas;
    destino: Coordenadas;
    largo: number;
    rumbo: number;
  }> = [];

  for (let i = 0; i < puntos.length - 1; i++) {
    const origen = puntos[i];
    const destino = puntos[i + 1];
    const largo = distanciaEntre(origen, destino);
    if (largo === null || largo < METROS_SEGMENTO_MINIMO) continue;
    const rumbo = rumboDelSegmento(origen, destino);
    if (rumbo === null) continue;
    segmentos.push({ origen, destino, largo, rumbo });
  }

  const total = segmentos.reduce((suma, segmento) => suma + segmento.largo, 0);
  if (total < METROS_TRAZADO_MINIMO) return [];

  const margen = Math.min(METROS_MARGEN_EXTREMOS, total * 0.15);
  const inicio = margen;
  const fin = total - margen;
  if (fin <= inicio) return [];

  const espacio = Math.max(METROS_ENTRE_FLECHAS, (fin - inicio) / MAX_FLECHAS_POR_SENTIDO);
  const distancias: number[] = [];
  for (let metros = inicio; metros < fin && distancias.length < MAX_FLECHAS_POR_SENTIDO; metros += espacio) {
    distancias.push(metros);
  }
  if (distancias.length === 0) distancias.push((inicio + fin) / 2);

  const flechas: FlechaRecorrido[] = [];
  for (const objetivo of distancias) {
    let acumulado = 0;
    for (const segmento of segmentos) {
      if (acumulado + segmento.largo < objetivo) {
        acumulado += segmento.largo;
        continue;
      }
      const t = (objetivo - acumulado) / segmento.largo;
      const punto = interpolar(segmento.origen, segmento.destino, t);
      flechas.push({
        latitud: punto.latitud,
        longitud: punto.longitud,
        rumbo: segmento.rumbo,
      });
      break;
    }
  }
  return flechas;
}

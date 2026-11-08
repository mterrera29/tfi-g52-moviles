import type { Coordenadas } from '@/tipos/linea';

export const METROS_EN_LA_PARADA = 20;
export const METROS_PRECISION_DUDOSA = 80;
export const MS_POSICION_VIEJA = 45_000;
const RADIO_TIERRA_M = 6_371_000;
const MIN_CAMPO_HORIZONTAL_UT = 3;
const MIN_CAMPO_TOTAL_UT = 10;
const MAX_CAMPO_TOTAL_UT = 100;

export function coordenadasValidas(punto: Coordenadas | null | undefined): punto is Coordenadas {
  if (!punto) return false;
  const { latitud, longitud } = punto;
  return (
    Number.isFinite(latitud) &&
    Number.isFinite(longitud) &&
    latitud >= -90 &&
    latitud <= 90 &&
    longitud >= -180 &&
    longitud <= 180
  );
}

export function destinoSigueSiendo(paradaIdActual: string, paradaIdEsperada: string): boolean {
  return paradaIdActual.length > 0 && paradaIdActual === paradaIdEsperada;
}

export function normalizarAngulo(grados: number): number {
  if (!Number.isFinite(grados)) return NaN;
  const vuelta = ((grados % 360) + 360) % 360;
  return vuelta;
}

export function diferenciaAngular(desde: number, hacia: number): number {
  const a = normalizarAngulo(desde);
  const b = normalizarAngulo(hacia);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return NaN;
  return ((b - a + 540) % 360) - 180;
}

export function suavizarAngulo(anterior: number, medido: number, factor = 0.25): number {
  const delta = diferenciaAngular(anterior, medido);
  if (!Number.isFinite(delta)) return normalizarAngulo(medido);
  return normalizarAngulo(anterior + delta * factor);
}

export function anguloCambioVisible(anterior: number | null, siguiente: number, umbral = 2): boolean {
  if (anterior === null) return Number.isFinite(siguiente);
  const delta = Math.abs(diferenciaAngular(anterior, siguiente));
  return Number.isFinite(delta) && delta >= umbral;
}

export function distanciaMetros(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) return NaN;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return RADIO_TIERRA_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function distanciaEntre(origen: Coordenadas, destino: Coordenadas): number | null {
  if (!coordenadasValidas(origen) || !coordenadasValidas(destino)) return null;
  const metros = distanciaMetros(origen.latitud, origen.longitud, destino.latitud, destino.longitud);
  return Number.isFinite(metros) ? metros : null;
}

export function rumboGeografico(origen: Coordenadas, destino: Coordenadas): number | null {
  if (!coordenadasValidas(origen) || !coordenadasValidas(destino)) return null;
  const metros = distanciaEntre(origen, destino);
  if (metros === null || metros < METROS_EN_LA_PARADA) return null;

  const phi1 = (origen.latitud * Math.PI) / 180;
  const phi2 = (destino.latitud * Math.PI) / 180;
  const dLambda = ((destino.longitud - origen.longitud) * Math.PI) / 180;
  const y = Math.sin(dLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLambda);
  if (!Number.isFinite(x) || !Number.isFinite(y) || (x === 0 && y === 0)) return null;
  return normalizarAngulo((Math.atan2(y, x) * 180) / Math.PI);
}

export type LecturaMagnetica = { x: number; y: number; z: number };

export function lecturaMagneticaUsable(lectura: LecturaMagnetica): boolean {
  const { x, y, z } = lectura;
  if (![x, y, z].every(Number.isFinite)) return false;
  if (x === 0 && y === 0 && z === 0) return false;
  return Math.hypot(x, y, z) >= MIN_CAMPO_HORIZONTAL_UT * 0.5;
}

export function convieneMantenerHorizontal(lectura: LecturaMagnetica): boolean {
  if (!lecturaMagneticaUsable(lectura)) return true;
  const horizontal = Math.hypot(lectura.x, lectura.y);
  const total = Math.hypot(lectura.x, lectura.y, lectura.z);
  if (total === 0) return true;
  return horizontal / total < 0.45;
}

export function campoMagneticoDudoso(lectura: LecturaMagnetica): boolean {
  if (!lecturaMagneticaUsable(lectura)) return true;
  const total = Math.hypot(lectura.x, lectura.y, lectura.z);
  return total < MIN_CAMPO_TOTAL_UT || total > MAX_CAMPO_TOTAL_UT;
}

export function rumboMagnetico(lectura: LecturaMagnetica): number | null {
  if (!lecturaMagneticaUsable(lectura)) return null;
  const { x, y } = lectura;
  if (Math.hypot(x, y) < MIN_CAMPO_HORIZONTAL_UT) return null;
  return normalizarAngulo((Math.atan2(x, y) * 180) / Math.PI);
}

export function actualizarFiltroMagnetico(
  previo: LecturaMagnetica | null,
  cruda: LecturaMagnetica,
): { suave: LecturaMagnetica | null; rumbo: number | null; invalidarFlecha: boolean } {
  if (!lecturaMagneticaUsable(cruda)) {
    return { suave: null, rumbo: null, invalidarFlecha: true };
  }
  const suave: LecturaMagnetica = previo
    ? {
        x: previo.x * 0.75 + cruda.x * 0.25,
        y: previo.y * 0.75 + cruda.y * 0.25,
        z: previo.z * 0.75 + cruda.z * 0.25,
      }
    : cruda;
  const rumbo = rumboMagnetico(suave);
  return { suave, rumbo, invalidarFlecha: rumbo === null };
}

export function hayQueInvalidarGps(ultimaUsableMs: number | null, ahoraMs: number): boolean {
  if (ultimaUsableMs === null) return false;
  if (!Number.isFinite(ultimaUsableMs) || !Number.isFinite(ahoraMs)) return true;
  return ahoraMs - ultimaUsableMs > MS_POSICION_VIEJA;
}

export function timestampGpsAMs(timestamp: number): number {
  if (!Number.isFinite(timestamp) || timestamp <= 0) return NaN;
  if (timestamp >= 1_000_000_000_000) return timestamp;
  if (timestamp >= 1_000_000_000) return timestamp * 1000;
  return timestamp;
}

export type FaltaSenalOrientacion = 'ninguna' | 'gps' | 'brujula' | 'ambas';

export function faltaSenalOrientacion(gpsOk: boolean, magOk: boolean): FaltaSenalOrientacion {
  if (gpsOk && magOk) return 'ninguna';
  if (!gpsOk && !magOk) return 'ambas';
  if (!gpsOk) return 'gps';
  return 'brujula';
}

export function rotacionHaciaDestino(rumboDestino: number, rumboTelefono: number): number | null {
  if (!Number.isFinite(rumboDestino) || !Number.isFinite(rumboTelefono)) return null;
  return normalizarAngulo(rumboDestino - rumboTelefono);
}

export function posicionGpsUsable(posicion: {
  latitud: number;
  longitud: number;
  timestampMs: number;
  ahoraMs: number;
}): boolean {
  if (!coordenadasValidas({ latitud: posicion.latitud, longitud: posicion.longitud })) return false;
  const stamp = timestampGpsAMs(posicion.timestampMs);
  if (!Number.isFinite(stamp) || !Number.isFinite(posicion.ahoraMs)) return false;
  return posicion.ahoraMs - stamp <= MS_POSICION_VIEJA;
}

export function posicionGpsConCoordenadas(posicion: {
  latitud: number;
  longitud: number;
}): boolean {
  return coordenadasValidas({ latitud: posicion.latitud, longitud: posicion.longitud });
}

export const CONSEJO_HORIZONTAL =
  'Para que la flecha sirva, tené el teléfono más o menos horizontal. El magnetómetro no dice si está de canto.';


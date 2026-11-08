import type { Aviso } from '@/tipos/aviso';
import type { Coordenadas } from '@/tipos/linea';

export type TrazadoAlternativoMapa = {
  id: string;
  titulo: string;
  puntos: Coordenadas[];
};

function esNumeroFinito(valor: unknown): valor is number {
  return typeof valor === 'number' && Number.isFinite(valor);
}

function esPuntoValido(punto: Coordenadas | null | undefined): punto is Coordenadas {
  if (!punto || typeof punto !== 'object') return false;
  if (!esNumeroFinito(punto.latitud) || !esNumeroFinito(punto.longitud)) return false;
  if (punto.latitud < -90 || punto.latitud > 90) return false;
  if (punto.longitud < -180 || punto.longitud > 180) return false;
  return true;
}

export function puntosTrazadoValidos(puntos: Coordenadas[] | null): Coordenadas[] {
  if (!Array.isArray(puntos)) return [];
  if (puntos.some((punto) => !esPuntoValido(punto))) return [];
  return puntos;
}

export function avisoDesvioVigente(aviso: Aviso, ahora: Date): boolean {
  if (aviso.gravedad !== 'desvio') return false;
  const desde = Date.parse(aviso.desde);
  if (Number.isNaN(desde) || desde > ahora.getTime()) return false;
  if (aviso.hasta === null) return true;
  const hasta = Date.parse(aviso.hasta);
  if (Number.isNaN(hasta)) return false;
  return ahora.getTime() <= hasta;
}

export function filtrarTrazadosAlternativos(
  avisos: Aviso[],
  ahora = new Date(),
): TrazadoAlternativoMapa[] {
  const resultado: TrazadoAlternativoMapa[] = [];
  for (const aviso of avisos) {
    if (!avisoDesvioVigente(aviso, ahora)) continue;
    const puntos = puntosTrazadoValidos(aviso.trazadoAlternativo);
    if (puntos.length < 2) continue;
    resultado.push({ id: aviso.id, titulo: aviso.titulo, puntos });
  }
  return resultado;
}

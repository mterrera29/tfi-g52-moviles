import type { Aviso } from '@/tipos/aviso';

export type EstadoLinea = 'desvio' | 'suspension';

/** Por cada línea con avisos vigentes, si tiene un desvío o una suspensión (la suspensión gana). */
export function estadosDeLineas(avisos: Aviso[]): Record<string, EstadoLinea> {
  const estados: Record<string, EstadoLinea> = {};
  for (const aviso of avisos) {
    if (aviso.gravedad === 'informativo') continue;
    for (const lineaId of aviso.lineaIds) {
      if (estados[lineaId] === 'suspension') continue;
      estados[lineaId] = aviso.gravedad;
    }
  }
  return estados;
}

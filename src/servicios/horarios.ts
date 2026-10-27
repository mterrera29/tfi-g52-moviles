import { cliente } from '@/servicios/cliente';
import type { Horario, TipoDeDia } from '@/tipos/horario';
import type { RespuestaLista } from '@/tipos/api';

export function obtenerHorariosPorParada(
  paradaId: string,
  tipoDeDia: TipoDeDia = 'habil',
): Promise<RespuestaLista<Horario>> {
  return cliente.get<RespuestaLista<Horario>>('/horarios', {
    params: { paradaId, tipoDeDia, porPagina: 5000 },
  }).then((r) => r.data);
}

export function obtenerProximosHorariosPorParada(
  paradaId: string,
  cantidad = 3,
  lineaId?: string,
): Promise<RespuestaLista<Horario>> {
  // La API elige los próximos y resuelve el cambio de día; no lo duplicamos acá.
  return cliente.get<RespuestaLista<Horario>>(`/paradas/${encodeURIComponent(paradaId)}/proximos`, {
    params: { cantidad, lineaId },
  }).then((r) => r.data);
}

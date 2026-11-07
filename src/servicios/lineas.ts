import { cliente } from '@/servicios/cliente';
import type { Linea } from '@/tipos/linea';
import type { RespuestaLista, RespuestaUno } from '@/tipos/api';

// Un solo cliente para toda la app (U05.T01 diap. 11).
export function obtenerLineas(): Promise<RespuestaLista<Linea>> {
  return cliente.get<RespuestaLista<Linea>>('/lineas', { params: { porPagina: 100 } }).then((r) => r.data);
}

export function obtenerLineaPorId(id: string): Promise<RespuestaUno<Linea>> {
  return cliente.get<RespuestaUno<Linea>>(`/lineas/${encodeURIComponent(id)}`).then((r) => r.data);
}

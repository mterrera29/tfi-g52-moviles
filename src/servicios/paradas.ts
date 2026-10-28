import { cliente } from '@/servicios/cliente';
import type { Parada } from '@/tipos/parada';
import type { RespuestaLista, RespuestaUno } from '@/tipos/api';

export function obtenerParadas(busqueda = ''): Promise<RespuestaLista<Parada>> {
  return cliente.get<RespuestaLista<Parada>>('/paradas', {
    params: { q: busqueda || undefined, porPagina: 1000 },
  }).then((r) => r.data);
}

export function obtenerParadaPorId(id: string): Promise<RespuestaUno<Parada>> {
  return cliente.get<RespuestaUno<Parada>>(`/paradas/${encodeURIComponent(id)}`).then((r) => r.data);
}

export function obtenerParadaPorQr(codigo: string): Promise<RespuestaUno<Parada>> {
  return cliente.get<RespuestaUno<Parada>>(`/paradas/qr/${encodeURIComponent(codigo)}`).then((r) => r.data);
}

export async function obtenerParadasPorIds(ids: string[]): Promise<RespuestaLista<Parada>> {
  // Conservamos el orden de paso del recorrido, no el orden del listado.
  const respuestas = await Promise.all(ids.map(obtenerParadaPorId));
  return {
    datos: respuestas.map((respuesta) => respuesta.datos),
    meta: { total: ids.length, pagina: 1, porPagina: ids.length },
  };
}

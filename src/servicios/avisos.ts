import { cliente } from '@/servicios/cliente';
import type { Aviso } from '@/tipos/aviso';
import type { RespuestaLista } from '@/tipos/api';

export function obtenerAvisosPorLinea(lineaId: string): Promise<RespuestaLista<Aviso>> {
  return cliente.get<RespuestaLista<Aviso>>('/avisos', {
    params: { estado: 'vigentes', lineaId, porPagina: 100 },
  }).then((r) => r.data);
}

export function obtenerAvisos(): Promise<RespuestaLista<Aviso>> {
  return cliente.get<RespuestaLista<Aviso>>('/avisos', {
    params: { estado: 'vigentes', porPagina: 100 },
  }).then((r) => r.data);
}

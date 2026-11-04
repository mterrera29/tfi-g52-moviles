import { cliente } from '@/servicios/cliente';
import type { Feriado, RespuestaLista } from '@/tipos/api';

export function obtenerFeriados(anio: number): Promise<RespuestaLista<Feriado>> {
  return cliente
    .get<RespuestaLista<Feriado>>('/feriados', { params: { anio } })
    .then((r) => r.data);
}

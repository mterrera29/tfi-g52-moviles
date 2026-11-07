import { cliente, normalizarError } from '@/servicios/cliente';
import type { RespuestaError, RespuestaUno, Salud } from '@/tipos/api';

export async function obtenerSalud(): Promise<Salud | RespuestaError> {
  try {
    const respuesta = await cliente.get<RespuestaUno<Salud>>('/salud');
    return respuesta.data.datos;
  } catch (error: unknown) {
    return normalizarError(error);
  }
}

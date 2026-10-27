import { cliente, normalizarError } from '@/servicios/cliente';
import type { RespuestaError, RespuestaUno } from '@/tipos/api';
import type { Usuario } from '@/tipos/usuario';

export async function obtenerUsuario(): Promise<RespuestaUno<Usuario> | RespuestaError> {
  try {
    // El mapper de la API devuelve exactamente los campos de Usuario del PRD.
    const respuesta = await cliente.get<RespuestaUno<Usuario>>('/yo');
    return respuesta.data;
  } catch (error: unknown) {
    return normalizarError(error);
  }
}

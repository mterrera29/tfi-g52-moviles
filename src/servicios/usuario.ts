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

export async function agregarLineaFavorita(lineaId: string): Promise<RespuestaUno<Usuario>> {
  const respuesta = await cliente.put<RespuestaUno<Usuario>>(`/yo/lineas-favoritas/${encodeURIComponent(lineaId)}`);
  return respuesta.data;
}

export async function quitarLineaFavorita(lineaId: string): Promise<void> {
  await cliente.delete(`/yo/lineas-favoritas/${encodeURIComponent(lineaId)}`);
}

export async function agregarParadaFavorita(paradaId: string): Promise<RespuestaUno<Usuario>> {
  const respuesta = await cliente.put<RespuestaUno<Usuario>>(`/yo/paradas-favoritas/${encodeURIComponent(paradaId)}`);
  return respuesta.data;
}

export async function quitarParadaFavorita(paradaId: string): Promise<void> {
  await cliente.delete(`/yo/paradas-favoritas/${encodeURIComponent(paradaId)}`);
}

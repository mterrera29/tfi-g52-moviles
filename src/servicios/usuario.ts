import { borrarClave, guardarJson, leerJson } from '@/lib/almacenClaveValor';
import { CLAVES } from '@/servicios/claves';
import { cliente, normalizarError } from '@/servicios/cliente';
import type { RespuestaError, RespuestaUno } from '@/tipos/api';
import type { Usuario } from '@/tipos/usuario';

export async function obtenerUsuario(): Promise<RespuestaUno<Usuario> | RespuestaError> {
  try {
    // El mapper de la API devuelve exactamente los campos de Usuario del PRD.
    const respuesta = await cliente.get<RespuestaUno<Usuario>>('/yo');
    // copia local del perfil y los favoritos para usar sin datos (PRD: persistencia de favoritos).
    // No es un dato sensible: va en kv-store; el token sigue en SecureStore.
    guardarJson(CLAVES.perfil, respuesta.data);
    return respuesta.data;
  } catch (error: unknown) {
    const normalizado = normalizarError(error);
    if (normalizado.error.codigo === 'SIN_CONEXION') {
      const guardado = leerJson<RespuestaUno<Usuario>>(CLAVES.perfil);
      if (guardado) return guardado;
    }
    return normalizado;
  }
}

export function borrarPerfilGuardado(): void {
  borrarClave(CLAVES.perfil);
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

export async function actualizarPerfil(datos: {
  avisosActivos?: boolean;
  tema?: Usuario['tema'];
  nombre?: string;
}): Promise<RespuestaUno<Usuario>> {
  const respuesta = await cliente.patch<RespuestaUno<Usuario>>('/yo', datos);
  return respuesta.data;
}

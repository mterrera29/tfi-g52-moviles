import { usuarioMock } from '@/mocks/usuario';
import { obtenerSesion } from '@/servicios/auth';
import type { Usuario } from '@/tipos/usuario';
import type { RespuestaError, RespuestaExito } from '@/tipos/linea';

const esperar = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

export async function obtenerUsuario(): Promise<
  RespuestaExito<Usuario> | RespuestaError
> {
  await esperar();

  const respuestaSesion = await obtenerSesion();

  if ('error' in respuestaSesion) {
    return respuestaSesion;
  }

  if (!respuestaSesion.datos) {
    return {
      error: {
        codigo: 'NO_AUTENTICADO',
        mensaje: 'Iniciá sesión para ver tu perfil.',
      },
    };
  }

  return {
    datos: respuestaSesion.datos.usuario,
    meta: {
      total: 1,
      pagina: 1,
      porPagina: 1,
    },
  };
}

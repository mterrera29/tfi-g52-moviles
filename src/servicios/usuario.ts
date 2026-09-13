import { usuarioMock } from '@/mocks/usuario';
import type { Usuario } from '@/tipos/usuario';
import type { RespuestaError, RespuestaExito } from '@/tipos/linea';

const esperar = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

export async function obtenerUsuario(): Promise<
  RespuestaExito<Usuario> | RespuestaError
> {
  await esperar();

  return {
    datos: usuarioMock,
    meta: {
      total: 1,
      pagina: 1,
      porPagina: 1,
    },
  };
}

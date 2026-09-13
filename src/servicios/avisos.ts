import { avisosMock } from '@/mocks/avisos';
import type { Aviso } from '@/tipos/aviso';
import type { RespuestaError, RespuestaExito } from '@/tipos/linea';

const esperar = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

export async function obtenerAvisosPorLinea(
  lineaId: string,
): Promise<RespuestaExito<Aviso[]> | RespuestaError> {
  await esperar();

  const avisos = avisosMock.filter((aviso) => aviso.lineaIds.includes(lineaId));

  return {
    datos: avisos,
    meta: {
      total: avisos.length,
      pagina: 1,
      porPagina: avisos.length,
    },
  };
}

export async function obtenerAvisos(): Promise<
  RespuestaExito<Aviso[]> | RespuestaError
> {
  await esperar();

  return {
    datos: avisosMock,
    meta: {
      total: avisosMock.length,
      pagina: 1,
      porPagina: 20,
    },
  };
}

import { lineasMock } from '@/mocks/lineas';
import type { Linea, RespuestaError, RespuestaExito } from '@/tipos/linea';

const esperar = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));

export async function obtenerLineas(): Promise<
  RespuestaExito<Linea[]> | RespuestaError
> {
  await esperar();

  return {
    datos: lineasMock,
    meta: {
      total: lineasMock.length,
      pagina: 1,
      porPagina: 20,
    },
  };
}
export async function obtenerLineaPorId(
  id: string,
): Promise<RespuestaExito<Linea> | RespuestaError> {
  await esperar();

  const linea = lineasMock.find((item) => item.id === id);

  if (!linea) {
    return {
      error: {
        codigo: 'LINEA_NO_ENCONTRADA',
        mensaje: 'No existe esa línea.',
      },
    };
  }

  return {
    datos: linea,
    meta: {
      total: 1,
      pagina: 1,
      porPagina: 1,
    },
  };
}

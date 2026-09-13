import { paradasMock } from '@/mocks/paradas';
import type { Parada } from '@/tipos/parada';
import type { RespuestaError, RespuestaExito } from '@/tipos/linea';

const esperar = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

export async function obtenerParadas(): Promise<
  RespuestaExito<Parada[]> | RespuestaError
> {
  await esperar();

  return {
    datos: paradasMock,
    meta: {
      total: paradasMock.length,
      pagina: 1,
      porPagina: 20,
    },
  };
}

export async function obtenerParadaPorId(
  id: string,
): Promise<RespuestaExito<Parada> | RespuestaError> {
  await esperar();

  const parada = paradasMock.find((item) => item.id === id);

  if (!parada) {
    return {
      error: {
        codigo: 'PARADA_NO_ENCONTRADA',
        mensaje: 'No existe esa parada.',
      },
    };
  }

  return {
    datos: parada,
    meta: {
      total: 1,
      pagina: 1,
      porPagina: 1,
    },
  };
}

export async function obtenerParadasPorIds(
  ids: string[],
): Promise<RespuestaExito<Parada[]> | RespuestaError> {
  await esperar();

  const paradas = ids
    .map((id) => paradasMock.find((parada) => parada.id === id))
    .filter((parada): parada is Parada => parada !== undefined);

  return {
    datos: paradas,
    meta: {
      total: paradas.length,
      pagina: 1,
      porPagina: paradas.length,
    },
  };
}

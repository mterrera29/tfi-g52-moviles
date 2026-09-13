import { horariosMock } from '@/mocks/horarios';
import type { Horario, TipoDeDia } from '@/tipos/horario';
import type { RespuestaError, RespuestaExito } from '@/tipos/linea';

const esperar = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

function ordenarPorHora(horarios: Horario[]) {
  return [...horarios].sort((a, b) => a.hora.localeCompare(b.hora));
}

export async function obtenerHorariosPorParada(
  paradaId: string,
  tipoDeDia: TipoDeDia = 'habil',
): Promise<RespuestaExito<Horario[]> | RespuestaError> {
  await esperar();

  const horarios = ordenarPorHora(
    horariosMock.filter(
      (horario) =>
        horario.paradaId === paradaId && horario.tipoDeDia === tipoDeDia,
    ),
  );

  return {
    datos: horarios,
    meta: {
      total: horarios.length,
      pagina: 1,
      porPagina: horarios.length,
    },
  };
}

export async function obtenerProximosHorariosPorParada(
  paradaId: string,
  cantidad = 3,
  tipoDeDia: TipoDeDia = 'habil',
): Promise<RespuestaExito<Horario[]> | RespuestaError> {
  const respuesta = await obtenerHorariosPorParada(paradaId, tipoDeDia);

  if ('error' in respuesta) {
    return respuesta;
  }

  const ahora = new Date();
  const minutosActuales = ahora.getHours() * 60 + ahora.getMinutes();

  const proximos = respuesta.datos.filter((horario) => {
    const [horas, minutos] = horario.hora.split(':').map(Number);
    const minutosHorario = horas * 60 + minutos;
    return minutosHorario >= minutosActuales;
  });

  const seleccionados =
    proximos.length > 0
      ? proximos.slice(0, cantidad)
      : respuesta.datos.slice(0, cantidad);

  return {
    datos: seleccionados,
    meta: {
      total: seleccionados.length,
      pagina: 1,
      porPagina: seleccionados.length,
    },
  };
}

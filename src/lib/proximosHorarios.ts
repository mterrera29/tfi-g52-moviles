import type { Feriado } from '@/tipos/api';
import type { Horario } from '@/tipos/horario';
import { elegirTipoDeDiaYmd } from '@/lib/tipoDeDia';
import {
  agregarDiasYmd,
  instanteParana,
  minutosDesdeMedianoche,
  partesParana,
} from '@/lib/zonaParana';

// Hoy + 7 días: cubre el mismo tipo de día de la semana que viene, sin una segunda semana.
const HORIZONTE_OFFSETS = 8;

export type ProximoConFecha = {
  horario: Horario;
  fechaServicio: string;
  minutosRestantes: number;
};

export type ProximoEnPantalla = {
  horario: Horario;
  fechaServicio: string | null;
  minutosRestantes: number | null;
  etiquetaDia: string | null;
};

export type OpcionesProximosParada = {
  tablas: Horario[];
  fallbackApi: Horario[];
  feriados: Feriado[];
  cantidad: number;
  ahora: Date;
  obtenidoEn: Date;
  calendarioListo: boolean;
  tablasCompletas: boolean;
};

function ordenarPorHora(a: Horario, b: Horario): number {
  return (minutosDesdeMedianoche(a.hora) ?? 0) - (minutosDesdeMedianoche(b.hora) ?? 0);
}

function minutosHasta(ahora: Date, fechaServicio: string, hora: string): number | null {
  const instante = instanteParana(fechaServicio, hora);
  if (!instante) return null;
  const diffMs = instante.getTime() - ahora.getTime();
  if (diffMs < 0) return null;
  return Math.floor(diffMs / 60_000);
}

function etiquetaDia(fechaServicio: string, hoyYmd: string): string | null {
  if (fechaServicio === hoyYmd) return null;
  if (fechaServicio === agregarDiasYmd(hoyYmd, 1)) return 'mañana';
  const [anio, mes, dia] = fechaServicio.split('-');
  return `${dia}/${mes}/${anio}`;
}

function sinFecha(horario: Horario): ProximoEnPantalla {
  return {
    horario,
    fechaServicio: null,
    minutosRestantes: null,
    etiquetaDia: null,
  };
}

export function proximosHorariosDesdeTabla(
  tablas: Horario[],
  feriados: Feriado[],
  cantidad: number,
  ahora = new Date(),
): ProximoConFecha[] {
  const inicio = partesParana(ahora);
  const resultado: ProximoConFecha[] = [];

  for (let offset = 0; offset < HORIZONTE_OFFSETS && resultado.length < cantidad; offset += 1) {
    const ymd = agregarDiasYmd(inicio.ymd, offset);
    const tipo = elegirTipoDeDiaYmd(ymd, feriados);
    const delDia = tablas.filter((horario) => horario.tipoDeDia === tipo).sort(ordenarPorHora);

    for (const horario of delDia) {
      const minutos = minutosHasta(ahora, ymd, horario.hora);
      if (minutos === null) continue;
      resultado.push({
        horario,
        fechaServicio: ymd,
        minutosRestantes: minutos,
      });
      if (resultado.length >= cantidad) break;
    }
  }

  return resultado;
}

export function anotarProximosDeApi(
  horarios: Horario[],
  feriados: Feriado[],
  obtenidoEn: Date,
  ahora: Date,
): ProximoEnPantalla[] {
  const origen = partesParana(obtenidoEn);
  const tipoAlObtener = elegirTipoDeDiaYmd(origen.ymd, feriados);
  const ymdMananaAlObtener = agregarDiasYmd(origen.ymd, 1);
  const tipoMananaAlObtener = elegirTipoDeDiaYmd(ymdMananaAlObtener, feriados);
  const hoyYmd = partesParana(ahora).ymd;

  return horarios.flatMap((horario) => {
    const instanteHoy = instanteParana(origen.ymd, horario.hora);
    const instanteManana = instanteParana(ymdMananaAlObtener, horario.hora);

    let fechaServicio: string | null = null;
    if (
      horario.tipoDeDia === tipoAlObtener &&
      instanteHoy &&
      instanteHoy.getTime() >= obtenidoEn.getTime()
    ) {
      fechaServicio = origen.ymd;
    } else if (
      horario.tipoDeDia === tipoMananaAlObtener &&
      instanteManana &&
      instanteManana.getTime() >= obtenidoEn.getTime()
    ) {
      fechaServicio = ymdMananaAlObtener;
    }

    if (!fechaServicio) {
      return [sinFecha(horario)];
    }

    const minutosRestantes = minutosHasta(ahora, fechaServicio, horario.hora);
    if (minutosRestantes === null) {
      return [];
    }

    return [
      {
        horario,
        fechaServicio,
        minutosRestantes,
        etiquetaDia: etiquetaDia(fechaServicio, hoyYmd),
      },
    ];
  });
}

export function todosHorariosParada(
  porTipo: Partial<Record<Horario['tipoDeDia'], Horario[]>>,
): Horario[] {
  return (['habil', 'sabado', 'domingo', 'feriado'] as const).flatMap((tipo) => porTipo[tipo] ?? []);
}

function mensajeHastaProximo(item: { horario: Horario; fechaServicio: string }, hoyYmd: string): string {
  if (item.fechaServicio === agregarDiasYmd(hoyYmd, 1)) {
    return `No hay más servicio hasta mañana a las ${item.horario.hora}`;
  }
  const etiqueta = etiquetaDia(item.fechaServicio, hoyYmd);
  return `No hay más servicio hasta el ${etiqueta} a las ${item.horario.hora}`;
}

export function mensajeSinProximosServicio(
  tablas: Horario[],
  feriados: Feriado[],
  ahora = new Date(),
): string {
  const siguiente = proximosHorariosDesdeTabla(tablas, feriados, 1, ahora)[0];
  if (!siguiente) {
    return 'No hay próximos servicios para esta parada.';
  }
  const hoyYmd = partesParana(ahora).ymd;
  if (siguiente.fechaServicio === hoyYmd) {
    return 'No hay próximos servicios para esta parada.';
  }
  return mensajeHastaProximo(siguiente, hoyYmd);
}

export function formatearMinutosRestantes(minutos: number): string {
  if (minutos < 1) return 'menos de 1 min';
  if (minutos < 60) return `en ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (resto === 0) return `en ${horas} h`;
  return `en ${horas} h ${resto} min`;
}

export function textoHorarioSegunTabla(item: ProximoEnPantalla): string {
  const partes = [`Según la tabla, ${item.horario.hora}`];
  if (item.etiquetaDia) partes.push(item.etiquetaDia);
  if (item.minutosRestantes === null) {
    return partes.join(' · ');
  }
  partes.push(formatearMinutosRestantes(item.minutosRestantes));
  return partes.join(' · ');
}

const MENSAJE_VACIO_GENERICO = 'No hay próximos servicios para esta parada.';
const MENSAJE_SIN_CALENDARIO =
  'No se pudo confirmar el calendario de feriados. Mostramos la hora según la tabla, sin minutos.';

export function resolverProximosParada(opciones: OpcionesProximosParada): {
  proximos: ProximoEnPantalla[];
  hoyAgotado: boolean;
  mensajeVacio: string | null;
  mensajeHoyAgotado: string | null;
} {
  const {
    tablas,
    fallbackApi,
    feriados,
    cantidad,
    ahora,
    obtenidoEn,
    calendarioListo,
    tablasCompletas,
  } = opciones;
  const hoyYmd = partesParana(ahora).ymd;

  if (calendarioListo && tablasCompletas) {
    const desdeTabla = proximosHorariosDesdeTabla(tablas, feriados, cantidad, ahora);
    const proximos = desdeTabla.map((item) => ({
      horario: item.horario,
      fechaServicio: item.fechaServicio,
      minutosRestantes: item.minutosRestantes,
      etiquetaDia: etiquetaDia(item.fechaServicio, hoyYmd),
    }));
    const quedaHoy = proximos.some((item) => item.fechaServicio === hoyYmd);
    const hoyAgotado = proximos.length > 0 && !quedaHoy;
    const primero = desdeTabla[0];
    return {
      proximos,
      hoyAgotado,
      mensajeVacio: proximos.length === 0 ? mensajeSinProximosServicio(tablas, feriados, ahora) : null,
      mensajeHoyAgotado: hoyAgotado && primero ? mensajeHastaProximo(primero, hoyYmd) : null,
    };
  }

  if (!calendarioListo) {
    const proximos = fallbackApi.slice(0, cantidad).map(sinFecha);
    return {
      proximos,
      hoyAgotado: false,
      mensajeVacio: proximos.length === 0 ? MENSAJE_SIN_CALENDARIO : null,
      mensajeHoyAgotado: null,
    };
  }

  const proximos = anotarProximosDeApi(fallbackApi, feriados, obtenidoEn, ahora).slice(0, cantidad);
  const hayIndatables = proximos.some((item) => item.fechaServicio === null);
  const quedaHoy = proximos.some((item) => item.fechaServicio === hoyYmd);
  const hoyAgotado = proximos.length > 0 && !hayIndatables && !quedaHoy;
  const primeroConFecha = proximos.find((item) => item.fechaServicio);

  return {
    proximos,
    hoyAgotado,
    mensajeVacio: proximos.length === 0 ? MENSAJE_VACIO_GENERICO : null,
    mensajeHoyAgotado:
      hoyAgotado && primeroConFecha?.fechaServicio
        ? mensajeHastaProximo(
            { horario: primeroConFecha.horario, fechaServicio: primeroConFecha.fechaServicio },
            hoyYmd,
          )
        : null,
  };
}

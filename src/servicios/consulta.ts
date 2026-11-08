import type { AxiosResponse } from 'axios';

import { obtenerConexion } from '@/db/conexion';
import {
  fechaDesdeCabecera,
  leerAvisoPorId,
  leerAvisos,
  leerEstadoHorariosParada,
  leerFeriados,
  leerLineaPorId,
  leerLineas,
  leerParadaPorId,
  leerParadas,
  leerParadasPorIds,
  persistirAvisos,
  persistirFeriados,
  persistirHorariosParada,
  persistirLinea,
  persistirLineas,
  persistirParada,
  persistirParadas,
  registrarUltimaSincronizacion,
} from '@/db/sqlite';
import {
  proximosHorariosDesdeTabla,
  resolverProximosParada,
  todosHorariosParada,
} from '@/lib/proximosHorarios';
import { partesParana } from '@/lib/zonaParana';
import { avisoVigente } from '@/lib/avisoVigente';
import { distanciaMetros } from '@/lib/rumboParada';
import { obtenerAvisos, obtenerAvisosPorLinea } from '@/servicios/avisos';
import { descargaDeAvisoEsLocal } from '@/servicios/videoAviso';
import { cliente, normalizarError } from '@/servicios/cliente';
import { obtenerFeriados } from '@/servicios/feriados';
import { obtenerHorariosPorParada, obtenerProximosHorariosPorParada } from '@/servicios/horarios';
import type { Aviso } from '@/tipos/aviso';
import type { Feriado, RespuestaError, RespuestaLista, RespuestaUno } from '@/tipos/api';
import type { Horario, TipoDeDia } from '@/tipos/horario';
import type { Linea, Recorrido, Sentido } from '@/tipos/linea';
import { elegirTipoDeDia } from '@/lib/tipoDeDia';
import { resumirHorarios, type ResumenHorariosSentido } from '@/lib/resumenLinea';
import type { Parada } from '@/tipos/parada';

const TIPOS_DE_DIA: TipoDeDia[] = ['habil', 'sabado', 'domingo', 'feriado'];

function esSinConexion(error: unknown): error is RespuestaError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'error' in error &&
    (error as RespuestaError).error.codigo === 'SIN_CONEXION'
  );
}

function marcarSincronizacion(respuesta: AxiosResponse<unknown>): void {
  registrarUltimaSincronizacion(fechaDesdeCabecera(respuesta.headers.date as string | undefined));
}

let feriadosSincronizados = false;

async function asegurarFeriadosEnSqlite(): Promise<void> {
  if (feriadosSincronizados) return;
  const db = obtenerConexion();
  const anioParana = Number(partesParana(new Date()).ymd.slice(0, 4));
  const anios = [anioParana, anioParana + 1];
  const listas = await Promise.all(anios.map((anio) => obtenerFeriados(anio)));
  const feriados = listas.flatMap((lista) => lista.datos);
  await persistirFeriados(db, feriados);
  feriadosSincronizados = true;
  registrarUltimaSincronizacion(new Date().toISOString());
}

async function calendarioListoDesdeSqlite(
  db: ReturnType<typeof obtenerConexion>,
  intentarRed: boolean,
): Promise<boolean> {
  if (intentarRed) {
    try {
      await asegurarFeriadosEnSqlite();
      return true;
    } catch {
      // El contrato no distingue lista vacía confirmada de feriados no bajados.
    }
  }
  const guardados = await leerFeriados(db);
  return guardados.length > 0;
}

async function persistirHorariosCompletosParada(paradaId: string): Promise<void> {
  const db = obtenerConexion();
  await Promise.all(
    TIPOS_DE_DIA.map(async (tipoDeDia) => {
      const respuesta = await obtenerHorariosPorParada(paradaId, tipoDeDia);
      await persistirHorariosParada(db, paradaId, tipoDeDia, respuesta.datos);
    }),
  );
}

export async function consultarLineas(): Promise<RespuestaLista<Linea>> {
  const db = obtenerConexion();
  try {
    const respuesta = await cliente.get<RespuestaLista<Linea>>('/lineas', { params: { porPagina: 100 } });
    marcarSincronizacion(respuesta);
    await persistirLineas(db, respuesta.data.datos);
    void asegurarFeriadosEnSqlite().catch(() => {});
    return respuesta.data;
  } catch (error) {
    const normalizado = normalizarError(error);
    if (!esSinConexion(normalizado)) throw normalizado;
    const datos = await leerLineas(db);
    if (datos.length === 0) throw normalizado;
    return { datos, meta: { total: datos.length, pagina: 1, porPagina: datos.length } };
  }
}

export async function consultarParadas(busqueda = ''): Promise<RespuestaLista<Parada>> {
  const db = obtenerConexion();
  try {
    const respuesta = await cliente.get<RespuestaLista<Parada>>('/paradas', {
      params: { q: busqueda || undefined, porPagina: 1000 },
    });
    marcarSincronizacion(respuesta);
    await persistirParadas(db, respuesta.data.datos);
    return respuesta.data;
  } catch (error) {
    const normalizado = normalizarError(error);
    if (!esSinConexion(normalizado)) throw normalizado;
    let datos = await leerParadas(db);
    const texto = busqueda.trim().toLowerCase();
    if (texto) {
      datos = datos.filter((parada) => parada.nombre.toLowerCase().includes(texto));
    }
    if (datos.length === 0) throw normalizado;
    return { datos, meta: { total: datos.length, pagina: 1, porPagina: datos.length } };
  }
}

export async function consultarParadasCercanas({
  latitud,
  longitud,
  radioMetros,
}: {
  latitud: number;
  longitud: number;
  radioMetros: number;
}): Promise<RespuestaLista<Parada>> {
  const db = obtenerConexion();
  try {
    const respuesta = await cliente.get<RespuestaLista<Parada>>('/paradas', {
      params: { latitud, longitud, radioMetros, orden: 'distancia', porPagina: 1000 },
    });
    marcarSincronizacion(respuesta);
    await persistirParadas(db, respuesta.data.datos);
    return respuesta.data;
  } catch (error) {
    const normalizado = normalizarError(error);
    if (!esSinConexion(normalizado)) throw normalizado;
    const todas = await leerParadas(db);
    const datos = todas
      .map((parada) => ({
        parada,
        distancia: distanciaMetros(latitud, longitud, parada.coordenadas.latitud, parada.coordenadas.longitud),
      }))
      .filter((item) => item.distancia <= radioMetros)
      .sort((a, b) => a.distancia - b.distancia)
      .map((item) => item.parada);
    if (datos.length === 0) throw normalizado;
    return { datos, meta: { total: datos.length, pagina: 1, porPagina: datos.length } };
  }
}

export type LineaDetalleConsulta = {
  linea: Linea;
  recorridos: Array<Recorrido & { paradas: Parada[] }>;
  avisos: Aviso[];
};

export async function consultarLineaDetalle(lineaId: string): Promise<LineaDetalleConsulta> {
  const db = obtenerConexion();
  try {
    const respuestaLinea = await cliente.get<RespuestaUno<Linea>>(`/lineas/${encodeURIComponent(lineaId)}`);
    marcarSincronizacion(respuestaLinea);
    const linea = respuestaLinea.data.datos;
    await persistirLinea(db, linea);

    const idsParadas = [...new Set(linea.recorridos.flatMap((recorrido) => recorrido.paradaIds))];
    const paradasRespuestas = await Promise.all(
      idsParadas.map((id) => cliente.get<RespuestaUno<Parada>>(`/paradas/${encodeURIComponent(id)}`)),
    );
    const paradas = paradasRespuestas.map((r) => r.data.datos);
    await persistirParadas(db, paradas);

    let avisos: Aviso[] = [];
    try {
      const respuestaAvisos = await obtenerAvisosPorLinea(lineaId);
      avisos = respuestaAvisos.datos;
      await persistirAvisos(db, avisos);
    } catch {
      avisos = (await leerAvisos(db)).filter(
        (aviso) => aviso.lineaIds.includes(lineaId) && avisoVigente(aviso),
      );
    }

    const recorridos = linea.recorridos.map((recorrido) => {
      const porId = new Map(paradas.map((parada) => [parada.id, parada] as const));
      return {
        ...recorrido,
        paradas: recorrido.paradaIds.map((id) => porId.get(id)).filter((parada): parada is Parada => !!parada),
      };
    });

    return { linea, recorridos, avisos };
  } catch (error) {
    const normalizado = normalizarError(error);
    if (!esSinConexion(normalizado)) throw normalizado;

    const linea = await leerLineaPorId(db, lineaId);
    if (!linea) throw normalizado;

    const recorridos = await Promise.all(
      linea.recorridos.map(async (recorrido) => ({
        ...recorrido,
        paradas: await leerParadasPorIds(db, recorrido.paradaIds),
      })),
    );

    const avisos = (await leerAvisos(db)).filter(
      (aviso) => aviso.lineaIds.includes(lineaId) && avisoVigente(aviso),
    );

    return { linea, recorridos, avisos };
  }
}

export type ParadaDetalleConsulta = {
  parada: Parada;
  lineas: Linea[];
  horarios: Horario[];
  tablas: Horario[];
  feriados: Feriado[];
  calendarioListo: boolean;
  tablasCompletas: boolean;
  consultadoEn: string;
  mensajeSinHorarios: string | null;
};

async function armarDetalleParada(
  db: ReturnType<typeof obtenerConexion>,
  parada: Parada,
  lineas: Linea[],
  horarios: Horario[],
  calendarioListo: boolean,
  consultadoEn: Date,
): Promise<ParadaDetalleConsulta> {
  const feriados = await leerFeriados(db);
  const estadoTablas = await leerEstadoHorariosParada(db, parada.id);
  const tablas = todosHorariosParada(estadoTablas.porTipo);
  const resuelto = resolverProximosParada({
    tablas,
    fallbackApi: horarios,
    feriados,
    cantidad: 3,
    ahora: consultadoEn,
    obtenidoEn: consultadoEn,
    calendarioListo,
    tablasCompletas: estadoTablas.completa,
  });

  return {
    parada,
    lineas,
    horarios,
    tablas,
    feriados,
    calendarioListo,
    tablasCompletas: estadoTablas.completa,
    consultadoEn: consultadoEn.toISOString(),
    mensajeSinHorarios: resuelto.mensajeVacio,
  };
}

export async function consultarParadaDetalle(paradaId: string, cantidad = 3): Promise<ParadaDetalleConsulta> {
  const db = obtenerConexion();
  try {
    const [respuestaParada, respuestaLineas, respuestaHorarios] = await Promise.all([
      cliente.get<RespuestaUno<Parada>>(`/paradas/${encodeURIComponent(paradaId)}`),
      cliente.get<RespuestaLista<Linea>>('/lineas', { params: { porPagina: 100 } }),
      obtenerProximosHorariosPorParada(paradaId, cantidad),
    ]);
    marcarSincronizacion(respuestaParada);
    await persistirParada(db, respuestaParada.data.datos);
    await persistirLineas(db, respuestaLineas.data.datos);
    await persistirHorariosCompletosParada(paradaId).catch(() => {});
    const calendarioListo = await calendarioListoDesdeSqlite(db, true);

    const parada = respuestaParada.data.datos;
    const lineas = respuestaLineas.data.datos.filter((linea) => parada.lineaIds.includes(linea.id));
    const horarios = respuestaHorarios.datos;

    return armarDetalleParada(db, parada, lineas, horarios, calendarioListo, new Date());
  } catch (error) {
    const normalizado = normalizarError(error);
    if (!esSinConexion(normalizado)) throw normalizado;

    const parada = await leerParadaPorId(db, paradaId);
    if (!parada) throw normalizado;

    const lineasTodas = await leerLineas(db);
    const lineas = lineasTodas.filter((linea) => parada.lineaIds.includes(linea.id));
    const feriados = await leerFeriados(db);
    const calendarioListo = feriados.length > 0;
    const estadoTablas = await leerEstadoHorariosParada(db, paradaId);
    const tablas = todosHorariosParada(estadoTablas.porTipo);
    const horarios =
      calendarioListo && estadoTablas.completa
        ? proximosHorariosDesdeTabla(tablas, feriados, cantidad).map((item) => item.horario)
        : [];

    return armarDetalleParada(db, parada, lineas, horarios, calendarioListo, new Date());
  }
}

export async function consultarParadaPorId(id: string): Promise<RespuestaUno<Parada>> {
  const db = obtenerConexion();
  try {
    const respuesta = await cliente.get<RespuestaUno<Parada>>(`/paradas/${encodeURIComponent(id)}`);
    marcarSincronizacion(respuesta);
    await persistirParada(db, respuesta.data.datos);
    return respuesta.data;
  } catch (error) {
    const normalizado = normalizarError(error);
    if (!esSinConexion(normalizado)) throw normalizado;
    const parada = await leerParadaPorId(db, id);
    if (!parada) throw normalizado;
    return { datos: parada, meta: null };
  }
}

export type ConsultaAvisos = RespuestaLista<Aviso> & {
  videosGuardados: string[];
};

async function idsVideosGuardados(avisos: Aviso[]): Promise<string[]> {
  const ids: string[] = [];
  for (const aviso of avisos) {
    if (await descargaDeAvisoEsLocal(aviso)) ids.push(aviso.id);
  }
  return ids;
}

export async function consultarAvisos(): Promise<ConsultaAvisos> {
  const db = obtenerConexion();
  try {
    const respuesta = await obtenerAvisos();
    await persistirAvisos(db, respuesta.datos);
    return {
      ...respuesta,
      videosGuardados: await idsVideosGuardados(respuesta.datos),
    };
  } catch (error) {
    const normalizado = normalizarError(error);
    if (!esSinConexion(normalizado)) throw normalizado;
    const datos = (await leerAvisos(db)).filter((aviso) => avisoVigente(aviso));
    if (datos.length === 0) throw normalizado;
    return {
      datos,
      meta: { total: datos.length, pagina: 1, porPagina: datos.length },
      videosGuardados: await idsVideosGuardados(datos),
    };
  }
}

export async function consultarAvisoPorId(id: string): Promise<{ aviso: Aviso; videoGuardado: boolean }> {
  const db = obtenerConexion();
  try {
    const respuesta = await obtenerAvisos();
    await persistirAvisos(db, respuesta.datos);
    const deRed = respuesta.datos.find((aviso) => aviso.id === id);
    if (deRed) {
      return { aviso: deRed, videoGuardado: await descargaDeAvisoEsLocal(deRed) };
    }
  } catch (error) {
    const normalizado = normalizarError(error);
    if (!esSinConexion(normalizado)) throw normalizado;
  }

  const local = await leerAvisoPorId(db, id);
  if (local && avisoVigente(local)) {
    return { aviso: local, videoGuardado: await descargaDeAvisoEsLocal(local) };
  }
  throw {
    error: {
      codigo: 'NO_ENCONTRADO',
      mensaje: 'Ese aviso no está vigente o no está guardado en el teléfono.',
    },
  } satisfies RespuestaError;
}

export type HorariosLineaHoy = {
  tipoDeDia: TipoDeDia;
  porSentido: Array<{ sentido: Sentido; resumen: ResumenHorariosSentido }>;
};

/** Primer/último servicio y frecuencia de hoy, tomados de la primera parada de cada sentido. */
export async function consultarHorariosLineaHoy(
  lineaId: string,
  recorridos: Array<Recorrido & { paradas: Parada[] }>,
): Promise<HorariosLineaHoy | null> {
  const db = obtenerConexion();
  const feriados = await leerFeriados(db);
  const tipoDeDia = elegirTipoDeDia(new Date(), feriados);
  const porSentido: HorariosLineaHoy['porSentido'] = [];
  for (const recorrido of recorridos) {
    const primera = recorrido.paradas[0];
    if (!primera) continue;
    const respuesta = await obtenerHorariosPorParada(primera.id, tipoDeDia);
    const resumen = resumirHorarios(respuesta.datos, lineaId, recorrido.sentido);
    if (resumen) porSentido.push({ sentido: recorrido.sentido, resumen });
  }
  return porSentido.length ? { tipoDeDia, porSentido } : null;
}

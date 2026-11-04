import type { AxiosResponse } from 'axios';

import { obtenerConexion } from '@/db/conexion';
import {
  fechaDesdeCabecera,
  leerFeriados,
  leerHorariosParada,
  leerLineaPorId,
  leerLineas,
  leerParadaPorId,
  leerParadas,
  leerParadasPorIds,
  persistirFeriados,
  persistirHorariosParada,
  persistirLinea,
  persistirLineas,
  persistirParada,
  persistirParadas,
  registrarUltimaSincronizacion,
} from '@/db/sqlite';
import { proximosHorariosDesdeTabla, todosHorariosParada } from '@/lib/proximosHorarios';
import { obtenerAvisosPorLinea } from '@/servicios/avisos';
import { cliente, normalizarError } from '@/servicios/cliente';
import { obtenerFeriados } from '@/servicios/feriados';
import { obtenerHorariosPorParada, obtenerProximosHorariosPorParada } from '@/servicios/horarios';
import type { Aviso } from '@/tipos/aviso';
import type { RespuestaError, RespuestaLista, RespuestaUno } from '@/tipos/api';
import type { Horario, TipoDeDia } from '@/tipos/horario';
import type { Linea, Recorrido } from '@/tipos/linea';
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
  const anios = [new Date().getFullYear(), new Date().getFullYear() + 1];
  const listas = await Promise.all(anios.map((anio) => obtenerFeriados(anio)));
  const feriados = listas.flatMap((lista) => lista.datos);
  await persistirFeriados(db, feriados);
  feriadosSincronizados = true;
  registrarUltimaSincronizacion(new Date().toISOString());
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

function distanciaMetros(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const radio = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return radio * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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
    } catch {
      avisos = [];
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

    return { linea, recorridos, avisos: [] };
  }
}

export type ParadaDetalleConsulta = {
  parada: Parada;
  lineas: Linea[];
  horarios: Horario[];
};

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
    void persistirHorariosCompletosParada(paradaId).catch(() => {});
    void asegurarFeriadosEnSqlite().catch(() => {});

    const parada = respuestaParada.data.datos;
    const lineas = respuestaLineas.data.datos.filter((linea) => parada.lineaIds.includes(linea.id));

    return {
      parada,
      lineas,
      horarios: respuestaHorarios.datos,
    };
  } catch (error) {
    const normalizado = normalizarError(error);
    if (!esSinConexion(normalizado)) throw normalizado;

    const parada = await leerParadaPorId(db, paradaId);
    if (!parada) throw normalizado;

    const lineasTodas = await leerLineas(db);
    const lineas = lineasTodas.filter((linea) => parada.lineaIds.includes(linea.id));
    const feriados = await leerFeriados(db);
    const porTipo = Object.fromEntries(
      await Promise.all(
        TIPOS_DE_DIA.map(async (tipo) => [tipo, await leerHorariosParada(db, paradaId, tipo)] as const),
      ),
    ) as Partial<Record<TipoDeDia, Horario[]>>;
    const horarios = proximosHorariosDesdeTabla(todosHorariosParada(porTipo), feriados, cantidad);

    return { parada, lineas, horarios };
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

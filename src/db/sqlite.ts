import type { SQLiteDatabase } from 'expo-sqlite';

import { guardarTexto } from '@/lib/almacenClaveValor';
import { CLAVES } from '@/servicios/claves';
import type { Feriado } from '@/tipos/api';
import type { Aviso } from '@/tipos/aviso';
import type { Horario, TipoDeDia } from '@/tipos/horario';
import type { Linea } from '@/tipos/linea';
import type { Parada } from '@/tipos/parada';
import type { ItemColaReporte } from '@/lib/colaReportes';

export type VideoAvisoGuardado = {
  avisoId: string;
  videoUrl: string;
  archivoUri: string;
  bytes: number;
};

export function fechaDesdeCabecera(fechaHttp: string | undefined): string {
  if (fechaHttp) {
    const parsed = Date.parse(fechaHttp);
    if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();
  }
  return new Date().toISOString();
}

export function registrarUltimaSincronizacion(iso: string): void {
  guardarTexto(CLAVES.ultimaSincronizacion, iso);
}

export async function persistirLineas(db: SQLiteDatabase, lineas: Linea[]): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const linea of lineas) {
      await db.runAsync('INSERT OR REPLACE INTO lineas (id, datos) VALUES (?, ?)', linea.id, JSON.stringify(linea));
    }
  });
}

export async function persistirLinea(db: SQLiteDatabase, linea: Linea): Promise<void> {
  await db.runAsync('INSERT OR REPLACE INTO lineas (id, datos) VALUES (?, ?)', linea.id, JSON.stringify(linea));
}

export async function persistirParadas(db: SQLiteDatabase, paradas: Parada[]): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const parada of paradas) {
      await db.runAsync('INSERT OR REPLACE INTO paradas (id, datos) VALUES (?, ?)', parada.id, JSON.stringify(parada));
    }
  });
}

export async function persistirParada(db: SQLiteDatabase, parada: Parada): Promise<void> {
  await db.runAsync('INSERT OR REPLACE INTO paradas (id, datos) VALUES (?, ?)', parada.id, JSON.stringify(parada));
}

export async function persistirHorariosParada(
  db: SQLiteDatabase,
  paradaId: string,
  tipoDeDia: TipoDeDia,
  horarios: Horario[],
): Promise<void> {
  await db.runAsync(
    'INSERT OR REPLACE INTO horarios (parada_id, tipo_de_dia, datos) VALUES (?, ?, ?)',
    paradaId,
    tipoDeDia,
    JSON.stringify(horarios),
  );
}

/**
 * Guarda de una sola vez las tablas de horarios de muchas paradas (sincronización completa).
 * Transacción exclusiva para que no se mezcle con otras escrituras que estén corriendo.
 */
export async function persistirTablasHorarios(
  db: SQLiteDatabase,
  tablas: Array<{ paradaId: string; tipoDeDia: TipoDeDia; horarios: Horario[] }>,
): Promise<void> {
  await db.withExclusiveTransactionAsync(async (txn) => {
    for (const tabla of tablas) {
      await txn.runAsync(
        'INSERT OR REPLACE INTO horarios (parada_id, tipo_de_dia, datos) VALUES (?, ?, ?)',
        tabla.paradaId,
        tabla.tipoDeDia,
        JSON.stringify(tabla.horarios),
      );
    }
  });
}

export async function persistirFeriados(db: SQLiteDatabase, feriados: Feriado[]): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const feriado of feriados) {
      await db.runAsync(
        'INSERT OR REPLACE INTO feriados (fecha, nombre) VALUES (?, ?)',
        feriado.fecha,
        feriado.nombre,
      );
    }
  });
}

export async function leerLineas(db: SQLiteDatabase): Promise<Linea[]> {
  const filas = await db.getAllAsync<{ datos: string }>('SELECT datos FROM lineas ORDER BY id');
  return filas.map((fila) => JSON.parse(fila.datos) as Linea);
}

export async function leerLineaPorId(db: SQLiteDatabase, id: string): Promise<Linea | null> {
  const fila = await db.getFirstAsync<{ datos: string }>('SELECT datos FROM lineas WHERE id = ?', id);
  return fila ? (JSON.parse(fila.datos) as Linea) : null;
}

export async function leerParadas(db: SQLiteDatabase): Promise<Parada[]> {
  const filas = await db.getAllAsync<{ datos: string }>('SELECT datos FROM paradas ORDER BY id');
  return filas.map((fila) => JSON.parse(fila.datos) as Parada);
}

export async function leerParadaPorId(db: SQLiteDatabase, id: string): Promise<Parada | null> {
  const fila = await db.getFirstAsync<{ datos: string }>('SELECT datos FROM paradas WHERE id = ?', id);
  return fila ? (JSON.parse(fila.datos) as Parada) : null;
}

export async function leerParadasPorIds(db: SQLiteDatabase, ids: string[]): Promise<Parada[]> {
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => '?').join(', ');
  const filas = await db.getAllAsync<{ datos: string }>(
    `SELECT datos FROM paradas WHERE id IN (${placeholders})`,
    ...ids,
  );
  const porId = new Map(filas.map((fila) => {
    const parada = JSON.parse(fila.datos) as Parada;
    return [parada.id, parada] as const;
  }));
  return ids.map((id) => porId.get(id)).filter((parada): parada is Parada => !!parada);
}

const TIPOS_DE_DIA: TipoDeDia[] = ['habil', 'sabado', 'domingo', 'feriado'];

export async function leerHorariosParada(
  db: SQLiteDatabase,
  paradaId: string,
  tipoDeDia: TipoDeDia,
): Promise<Horario[]> {
  const fila = await db.getFirstAsync<{ datos: string }>(
    'SELECT datos FROM horarios WHERE parada_id = ? AND tipo_de_dia = ?',
    paradaId,
    tipoDeDia,
  );
  return fila ? (JSON.parse(fila.datos) as Horario[]) : [];
}

export async function leerEstadoHorariosParada(
  db: SQLiteDatabase,
  paradaId: string,
): Promise<{ completa: boolean; porTipo: Partial<Record<TipoDeDia, Horario[]>> }> {
  const filas = await db.getAllAsync<{ tipo_de_dia: TipoDeDia; datos: string }>(
    'SELECT tipo_de_dia, datos FROM horarios WHERE parada_id = ?',
    paradaId,
  );
  const porTipo: Partial<Record<TipoDeDia, Horario[]>> = {};
  for (const fila of filas) {
    porTipo[fila.tipo_de_dia] = JSON.parse(fila.datos) as Horario[];
  }
  const completa = TIPOS_DE_DIA.every((tipo) =>
    filas.some((fila) => fila.tipo_de_dia === tipo),
  );
  return { completa, porTipo };
}

export async function leerFeriados(db: SQLiteDatabase): Promise<Feriado[]> {
  return db.getAllAsync<Feriado>('SELECT fecha, nombre FROM feriados ORDER BY fecha');
}

export async function persistirAvisos(db: SQLiteDatabase, avisos: Aviso[]): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const aviso of avisos) {
      await db.runAsync('INSERT OR REPLACE INTO avisos (id, datos) VALUES (?, ?)', aviso.id, JSON.stringify(aviso));
    }
  });
}

export async function persistirAviso(db: SQLiteDatabase, aviso: Aviso): Promise<void> {
  await db.runAsync('INSERT OR REPLACE INTO avisos (id, datos) VALUES (?, ?)', aviso.id, JSON.stringify(aviso));
}

export async function leerAvisos(db: SQLiteDatabase): Promise<Aviso[]> {
  const filas = await db.getAllAsync<{ datos: string }>('SELECT datos FROM avisos ORDER BY id');
  return filas.map((fila) => JSON.parse(fila.datos) as Aviso);
}

export async function leerAvisoPorId(db: SQLiteDatabase, id: string): Promise<Aviso | null> {
  const fila = await db.getFirstAsync<{ datos: string }>('SELECT datos FROM avisos WHERE id = ?', id);
  return fila ? (JSON.parse(fila.datos) as Aviso) : null;
}

export async function persistirVideoAviso(db: SQLiteDatabase, video: VideoAvisoGuardado): Promise<void> {
  await db.runAsync(
    'INSERT OR REPLACE INTO videos_aviso (aviso_id, video_url, archivo_uri, bytes) VALUES (?, ?, ?, ?)',
    video.avisoId,
    video.videoUrl,
    video.archivoUri,
    video.bytes,
  );
}

export async function leerVideoAviso(db: SQLiteDatabase, avisoId: string): Promise<VideoAvisoGuardado | null> {
  const fila = await db.getFirstAsync<{ aviso_id: string; video_url: string; archivo_uri: string; bytes: number }>(
    'SELECT aviso_id, video_url, archivo_uri, bytes FROM videos_aviso WHERE aviso_id = ?',
    avisoId,
  );
  if (!fila) return null;
  return {
    avisoId: fila.aviso_id,
    videoUrl: fila.video_url,
    archivoUri: fila.archivo_uri,
    bytes: fila.bytes,
  };
}

export async function leerVideosAviso(db: SQLiteDatabase): Promise<VideoAvisoGuardado[]> {
  const filas = await db.getAllAsync<{ aviso_id: string; video_url: string; archivo_uri: string; bytes: number }>(
    'SELECT aviso_id, video_url, archivo_uri, bytes FROM videos_aviso',
  );
  return filas.map((fila) => ({
    avisoId: fila.aviso_id,
    videoUrl: fila.video_url,
    archivoUri: fila.archivo_uri,
    bytes: fila.bytes,
  }));
}

export async function borrarVideoAviso(db: SQLiteDatabase, avisoId: string): Promise<void> {
  await db.runAsync('DELETE FROM videos_aviso WHERE aviso_id = ?', avisoId);
}

export async function persistirReportePendiente(db: SQLiteDatabase, item: ItemColaReporte): Promise<void> {
  await db.runAsync(
    'INSERT OR REPLACE INTO reportes_pendientes (id, usuario_id, datos) VALUES (?, ?, ?)',
    item.id,
    item.usuarioId,
    JSON.stringify(item),
  );
}

export async function leerReportesPendientes(db: SQLiteDatabase): Promise<ItemColaReporte[]> {
  const filas = await db.getAllAsync<{ datos: string }>(
    'SELECT datos FROM reportes_pendientes ORDER BY id',
  );
  return filas.map((fila) => JSON.parse(fila.datos) as ItemColaReporte);
}

export async function leerReportesPendientesDeUsuario(
  db: SQLiteDatabase,
  usuarioId: string,
): Promise<ItemColaReporte[]> {
  const filas = await db.getAllAsync<{ datos: string }>(
    'SELECT datos FROM reportes_pendientes WHERE usuario_id = ? ORDER BY id',
    usuarioId,
  );
  return filas.map((fila) => JSON.parse(fila.datos) as ItemColaReporte);
}

export async function borrarReportePendiente(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM reportes_pendientes WHERE id = ?', id);
}

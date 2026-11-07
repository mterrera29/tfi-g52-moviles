import type { SQLiteDatabase } from 'expo-sqlite';

import { guardarTexto } from '@/lib/almacenClaveValor';
import { CLAVES } from '@/servicios/claves';
import type { Feriado } from '@/tipos/api';
import type { Horario, TipoDeDia } from '@/tipos/horario';
import type { Linea } from '@/tipos/linea';
import type { Parada } from '@/tipos/parada';
import type { ReportePendiente } from '@/tipos/reporte';

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

export async function leerFeriados(db: SQLiteDatabase): Promise<Feriado[]> {
  return db.getAllAsync<Feriado>('SELECT fecha, nombre FROM feriados ORDER BY fecha');
}

export async function guardarReporte(db: SQLiteDatabase, reporte: ReportePendiente): Promise<void> {
  await db.runAsync(
    'INSERT OR REPLACE INTO reportes (id, datos, estado, intentos, creado_en, actualizado_en) VALUES (?, ?, ?, ?, ?, ?)',
    reporte.id,
    JSON.stringify(reporte),
    reporte.estado,
    reporte.intentos,
    reporte.creadoEn,
    reporte.actualizadoEn,
  );
}

export async function leerReportesPendientes(db: SQLiteDatabase): Promise<ReportePendiente[]> {
  const filas = await db.getAllAsync<{ datos: string }>(
    "SELECT datos FROM reportes WHERE estado = 'pendiente' ORDER BY creado_en",
  );
  return filas.map((fila) => JSON.parse(fila.datos) as ReportePendiente);
}

export async function actualizarReporte(db: SQLiteDatabase, reporte: ReportePendiente): Promise<void> {
  await db.runAsync(
    'UPDATE reportes SET datos = ?, estado = ?, intentos = ?, actualizado_en = ? WHERE id = ?',
    JSON.stringify(reporte),
    reporte.estado,
    reporte.intentos,
    reporte.actualizadoEn,
    reporte.id,
  );
}

export async function eliminarReporte(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM reportes WHERE id = ?', id);
}

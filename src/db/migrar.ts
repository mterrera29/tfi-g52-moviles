import type { SQLiteDatabase } from 'expo-sqlite';

import { registrarConexion } from '@/db/conexion';

const VERSION = 2;

export async function migrar(db: SQLiteDatabase): Promise<void> {
  registrarConexion(db);

  const fila = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let actual = fila?.user_version ?? 0;
  if (actual >= VERSION) return;

  if (actual === 0) {
    await db.execAsync(`PRAGMA journal_mode = 'wal';
      CREATE TABLE lineas (
        id TEXT PRIMARY KEY NOT NULL,
        datos TEXT NOT NULL
      );
      CREATE TABLE paradas (
        id TEXT PRIMARY KEY NOT NULL,
        datos TEXT NOT NULL
      );
      CREATE TABLE horarios (
        parada_id TEXT NOT NULL,
        tipo_de_dia TEXT NOT NULL,
        datos TEXT NOT NULL,
        PRIMARY KEY (parada_id, tipo_de_dia)
      );
      CREATE INDEX idx_horarios_parada ON horarios (parada_id);
      CREATE TABLE feriados (
        fecha TEXT PRIMARY KEY NOT NULL,
        nombre TEXT NOT NULL
      );
      CREATE TABLE reportes (
        id TEXT PRIMARY KEY NOT NULL,
        datos TEXT NOT NULL,
        estado TEXT NOT NULL DEFAULT 'pendiente',
        intentos INTEGER NOT NULL DEFAULT 0,
        creado_en TEXT NOT NULL,
        actualizado_en TEXT NOT NULL
      );
      CREATE INDEX idx_reportes_estado ON reportes (estado);`);
    actual = 1;
  }

  if (actual === 1) {
    await db.execAsync(`CREATE TABLE IF NOT EXISTS reportes (
        id TEXT PRIMARY KEY NOT NULL,
        datos TEXT NOT NULL,
        estado TEXT NOT NULL DEFAULT 'pendiente',
        intentos INTEGER NOT NULL DEFAULT 0,
        creado_en TEXT NOT NULL,
        actualizado_en TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_reportes_estado ON reportes (estado);`);
  }

  await db.execAsync(`PRAGMA user_version = ${VERSION}`);
}

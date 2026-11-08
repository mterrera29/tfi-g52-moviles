import type { SQLiteDatabase } from 'expo-sqlite';

import { registrarConexion } from '@/db/conexion';

const VERSION = 3;

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
      );`);
    actual = 1;
  }

  if (actual === 1) {
    await db.execAsync(`
      CREATE TABLE avisos (
        id TEXT PRIMARY KEY NOT NULL,
        datos TEXT NOT NULL
      );
      CREATE TABLE videos_aviso (
        aviso_id TEXT PRIMARY KEY NOT NULL,
        video_url TEXT NOT NULL,
        archivo_uri TEXT NOT NULL,
        bytes INTEGER NOT NULL
      );`);
    actual = 2;
  }

  if (actual === 2) {
    await db.execAsync(`
      CREATE TABLE reportes_pendientes (
        id TEXT PRIMARY KEY NOT NULL,
        usuario_id TEXT NOT NULL,
        datos TEXT NOT NULL
      );
      CREATE INDEX idx_reportes_pendientes_usuario ON reportes_pendientes (usuario_id);`);
    actual = 3;
  }

  await db.execAsync(`PRAGMA user_version = ${VERSION}`);
}

import type { SQLiteDatabase } from 'expo-sqlite';

// extra: TanStack Query ejecuta queryFn fuera del árbol de React, sin acceso a useSQLiteContext.
let conexion: SQLiteDatabase | null = null;

export function registrarConexion(db: SQLiteDatabase): void {
  conexion = db;
}

export function obtenerConexion(): SQLiteDatabase {
  if (!conexion) {
    throw new Error('La base SQLite todavía no está lista.');
  }
  return conexion;
}

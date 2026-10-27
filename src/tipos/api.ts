import type { Usuario } from '@/tipos/usuario';

export interface Meta {
  total: number;
  pagina: number;
  porPagina: number;
}

export interface RespuestaLista<T> {
  datos: T[];
  meta: Meta;
}

export interface RespuestaUno<T> {
  datos: T;
  meta: null;
}

export interface RespuestaError {
  error: {
    codigo: string;
    mensaje: string;
  };
}

export interface Sesion {
  token: string;
  usuario: Usuario;
}

export interface ArchivoSubido {
  url: string;
  tipo: 'imagen' | 'audio' | 'video';
  bytes: number;
}

export interface Feriado {
  fecha: string; // AAAA-MM-DD, para elegir la tabla de horarios sin conexión.
  nombre: string;
}

export interface Salud {
  estado: 'ok';
  motor: 'better-sqlite3' | 'postgres' | 'mysql' | 'mariadb';
  almacen: 'local' | 'aws' | 'supabase' | 'r2' | 'b2' | 's3proxy' | 'localstack';
  version: string;
}

// TEMPORAL hasta migrar a la API: los mocks todavía usan meta en recursos sueltos.
export interface RespuestaExito<T> {
  datos: T;
  meta: Meta;
}

import axios from 'axios';
import type { RespuestaError } from '@/tipos/api';

let tokenActual: string | null = null;
let alCerrarSesion: (() => void) | null = null;

// Queda sólo en memoria hasta que agreguemos persistencia de sesión.
export function establecerToken(token: string | null): void {
  tokenActual = token;
}

// Dejá acá el cierre de sesión cuando conectemos el contexto (U05.T01 diap. 12).
export function establecerAlCerrarSesion(funcion: (() => void) | null): void {
  alCerrarSesion = funcion;
}

export const cliente = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  timeout: 10_000,
});

cliente.interceptors.request.use((configuracion) => {
  if (tokenActual) {
    configuracion.headers.set('Authorization', `Bearer ${tokenActual}`);
  }
  return configuracion;
});

function esRespuestaError(valor: unknown): valor is RespuestaError {
  if (typeof valor !== 'object' || valor === null || !('error' in valor)) return false;
  const error = valor.error;
  return (
    typeof error === 'object' && error !== null &&
    'codigo' in error && typeof error.codigo === 'string' &&
    'mensaje' in error && typeof error.mensaje === 'string'
  );
}

export function normalizarError(error: unknown): RespuestaError {
  // Permite volver a normalizar lo que ya pasó por el interceptor.
  if (esRespuestaError(error)) return error;

  if (axios.isAxiosError<unknown>(error)) {
    if (!error.response) {
      return {
        error: {
          codigo: 'SIN_CONEXION',
          mensaje: 'No pudimos conectarnos. Revisá tu conexión.',
        },
      };
    }
    if (esRespuestaError(error.response.data)) return error.response.data;
  }

  // Una respuesta inesperada también mantiene el mismo sobre de error.
  return {
    error: {
      codigo: 'ERROR_INTERNO',
      mensaje: 'No pudimos completar el pedido. Intentá de nuevo.',
    },
  };
}

cliente.interceptors.response.use(
  (respuesta) => respuesta,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      // Limpiamos el token para no volver a mandarlo (U05.T01 diap. 12).
      establecerToken(null);
      alCerrarSesion?.();
    }
    return Promise.reject(normalizarError(error));
  },
);

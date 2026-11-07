import axios from 'axios';
import type { RespuestaError } from '@/tipos/api';

let tokenActual: string | null = null;
let alCerrarSesion: (() => Promise<void>) | null = null;

// Copia en memoria del token restaurado desde SecureStore.
export function establecerToken(token: string | null): void {
  tokenActual = token;
}

// El contexto conecta el cierre centralizado (U05.T01 diap. 12).
export function establecerAlCerrarSesion(funcion: (() => Promise<void>) | null): void {
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
  async (error: unknown) => {
    const respuesta = normalizarError(error);
    // Un 401 en un solo lado (U05.T01 diap. 12). El login con clave mala
    // también devuelve 401 (CREDENCIALES_INVALIDAS) y ahí no hay sesión que cerrar.
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      respuesta.error.codigo !== 'CREDENCIALES_INVALIDAS'
    ) {
      establecerToken(null);
      await alCerrarSesion?.();
    }
    return Promise.reject(respuesta);
  },
);

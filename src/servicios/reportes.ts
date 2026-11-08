// Adaptado de Lucas-v1 (9bedb95 / Luquitas234): cola SQLite, foto opcional y
// háptica de confirmación. No se copió su POST /reportes con FormData campo
// `foto`, ni ids sin prefijo `rep-`, ni user_version=2. Contrato cátedra:
// POST /archivos (multipart `archivo`) y después POST /reportes-demora JSON
// con fotoUri. La cola es v3 aditiva. procesarReportesPendientes de Lucas
// nunca se llamaba; acá el drenaje se dispara al reconectar y al abrir.

import { obtenerConexion } from '@/db/conexion';
import {
  borrarReportePendiente,
  leerReportesPendientes,
  leerReportesPendientesDeUsuario,
  persistirReportePendiente,
} from '@/db/sqlite';
import {
  mensajeResultadoReporte,
  nuevoIdReporte,
  type ItemColaReporte,
  type ResultadoIntentoReporte,
} from '@/lib/colaReportes';
import {
  crearExclusionDrenaje,
  drenarCola,
  type DependenciasEnvioReporte,
} from '@/lib/enviarReporte';
import { cliente, normalizarError } from '@/servicios/cliente';
import { borrarFotoCola, persistirFotoParaCola } from '@/servicios/fotoReporte';
import { confirmarHaptica } from '@/servicios/haptica';
import type { ArchivoSubido, RespuestaError, RespuestaUno } from '@/tipos/api';
import type { MotivoDemora, ReporteDeDemora } from '@/tipos/reporte';

const exclusionDrenaje = crearExclusionDrenaje();

export type PedidoNuevoReporte = {
  usuarioId: string;
  lineaId: string;
  paradaId: string;
  motivo: MotivoDemora;
  comentario: string | null;
  fotoUriOrigen: string | null;
  fotoMime: string | null;
};

export type ResultadoGuardarReporte = {
  resultado: ResultadoIntentoReporte;
  mensaje: string;
  item: ItemColaReporte | null;
  error: RespuestaError | null;
};

function depsSqlite(): DependenciasEnvioReporte {
  const db = obtenerConexion();
  return {
    subirArchivo: async (uriLocal) => {
      const nombre = uriLocal.split('/').pop() ?? 'foto.jpg';
      const extension = nombre.split('.').pop()?.toLowerCase();
      const tipo =
        extension === 'png' ? 'image/png' : extension === 'webp' ? 'image/webp' : 'image/jpeg';
      const datos = new FormData();
      datos.append(
        'archivo',
        {
          uri: uriLocal,
          name: nombre,
          type: tipo,
        } as unknown as Blob,
      );
      const respuesta = await cliente.post<RespuestaUno<ArchivoSubido>>('/archivos', datos, {
        headers: { 'Content-Type': 'multipart/form-data' },
        transformRequest: (cuerpo) => cuerpo,
      });
      const url = respuesta.data.datos.url;
      if (!url) {
        throw {
          error: {
            codigo: 'ERROR_INTERNO',
            mensaje: 'El servidor no devolvió la URL de la foto.',
          },
        } satisfies RespuestaError;
      }
      return url;
    },
    crearReporte: async (cuerpo) => {
      try {
        await cliente.post<RespuestaUno<ReporteDeDemora>>('/reportes-demora', cuerpo);
        return null;
      } catch (error) {
        const normalizado = normalizarError(error);
        return normalizado.error.codigo;
      }
    },
    persistirItem: (item) => persistirReportePendiente(db, item),
    borrarItem: (id) => borrarReportePendiente(db, id),
  };
}

export async function listarReportesPendientes(usuarioId: string): Promise<ItemColaReporte[]> {
  return leerReportesPendientesDeUsuario(obtenerConexion(), usuarioId);
}

export async function drenarReportesPendientes(sesionUsuarioId: string | null): Promise<void> {
  await exclusionDrenaje(async () => {
    if (!sesionUsuarioId) return;
    const items = await leerReportesPendientes(obtenerConexion());
    await drenarCola(items, sesionUsuarioId, depsSqlite());
  });
}

export async function guardarYEnviarReporte(pedido: PedidoNuevoReporte): Promise<ResultadoGuardarReporte> {
  const id = nuevoIdReporte(Date.now(), Math.random().toString(36).slice(2, 8));
  let fotoLocalUri: string | null = null;

  try {
    if (pedido.fotoUriOrigen) {
      const copiada = await persistirFotoParaCola(pedido.fotoUriOrigen, id, pedido.fotoMime);
      fotoLocalUri = copiada.uri;
    }

    const item: ItemColaReporte = {
      id,
      usuarioId: pedido.usuarioId,
      lineaId: pedido.lineaId,
      paradaId: pedido.paradaId,
      motivo: pedido.motivo,
      comentario: pedido.comentario,
      fotoLocalUri,
      fotoRemotaUri: null,
      fechaHora: new Date().toISOString(),
      intentos: 0,
      lastErrorCodigo: null,
    };

    await persistirReportePendiente(obtenerConexion(), item);
    await drenarReportesPendientes(pedido.usuarioId);

    const pendientes = await leerReportesPendientesDeUsuario(obtenerConexion(), pedido.usuarioId);
    const actualizado = pendientes.find((pendiente) => pendiente.id === id) ?? null;
    const resultado: ResultadoIntentoReporte = actualizado
      ? actualizado.lastErrorCodigo &&
        actualizado.lastErrorCodigo !== 'SIN_CONEXION' &&
        actualizado.lastErrorCodigo !== 'ERROR_INTERNO' &&
        actualizado.lastErrorCodigo !== 'ALMACEN_NO_DISPONIBLE' &&
        actualizado.lastErrorCodigo !== 'NO_AUTENTICADO'
        ? 'rechazado'
        : 'encolado'
      : 'enviado';

    await confirmarHaptica(resultado);
    if (resultado === 'enviado') {
      await borrarFotoCola(fotoLocalUri);
    }

    return {
      resultado,
      mensaje: mensajeResultadoReporte(resultado),
      item: actualizado ?? item,
      error:
        resultado === 'rechazado'
          ? {
              error: {
                codigo: actualizado?.lastErrorCodigo ?? 'VALIDACION_FALLIDA',
                mensaje: 'El servidor no aceptó el reporte. Quedó en el teléfono marcado para no reenviarlo en loop.',
              },
            }
          : null,
    };
  } catch (error) {
    const normalizado = normalizarError(error);
    await confirmarHaptica('rechazado');
    return {
      resultado: 'rechazado',
      mensaje: normalizado.error.mensaje,
      item: null,
      error: normalizado,
    };
  }
}

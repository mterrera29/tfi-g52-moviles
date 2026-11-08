import type { MotivoDemora } from '@/tipos/reporte';

export const PREFIJO_ID_REPORTE = 'rep-';
export const BYTES_MAX_FOTO = 5 * 1024 * 1024;
export const TIPOS_FOTO_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'] as const;

export type ItemColaReporte = {
  id: string;
  usuarioId: string;
  lineaId: string;
  paradaId: string;
  motivo: MotivoDemora;
  comentario: string | null;
  fotoLocalUri: string | null;
  fotoRemotaUri: string | null;
  fechaHora: string;
  intentos: number;
  lastErrorCodigo: string | null;
};

export type CuerpoPostReporteDemora = {
  id: string;
  lineaId: string;
  paradaId: string;
  motivo: MotivoDemora;
  comentario: string | null;
  fotoUri: string | null;
  fechaHora: string;
};

export type ResultadoIntentoReporte = 'enviado' | 'encolado' | 'rechazado';

export function nuevoIdReporte(ahoraMs: number, aleatorio: string): string {
  const limpio = aleatorio.replace(/[^a-z0-9]/gi, '').toLowerCase();
  return `${PREFIJO_ID_REPORTE}${ahoraMs.toString(36)}${limpio}`;
}

export function idReporteConFormato(id: string): boolean {
  return id.startsWith(PREFIJO_ID_REPORTE) && id.length > PREFIJO_ID_REPORTE.length;
}

export function esCodigoDuplicadoAceptable(codigo: string): boolean {
  return codigo === 'ID_EN_USO' || codigo === 'REPORTE_YA_ENVIADO';
}

export function esErrorTransitorio(codigo: string): boolean {
  return (
    codigo === 'SIN_CONEXION' ||
    codigo === 'ERROR_INTERNO' ||
    codigo === 'ALMACEN_NO_DISPONIBLE'
  );
}

export function esErrorDeAuth(codigo: string): boolean {
  return codigo === 'NO_AUTENTICADO';
}

export function debeDrenarItem(item: ItemColaReporte, sesionUsuarioId: string | null): boolean {
  if (!sesionUsuarioId) return false;
  if (item.usuarioId !== sesionUsuarioId) return false;
  if (item.lastErrorCodigo && !esErrorTransitorio(item.lastErrorCodigo) && !esErrorDeAuth(item.lastErrorCodigo)) {
    return false;
  }
  return true;
}

export function cuerpoPostReporteDemora(item: ItemColaReporte): CuerpoPostReporteDemora {
  return {
    id: item.id,
    lineaId: item.lineaId,
    paradaId: item.paradaId,
    motivo: item.motivo,
    comentario: item.comentario,
    fotoUri: item.fotoRemotaUri,
    fechaHora: item.fechaHora,
  };
}

export function mimeFotoPermitido(mime: string | null): boolean {
  if (!mime) return false;
  return (TIPOS_FOTO_PERMITIDOS as readonly string[]).includes(mime);
}

export function fotoDentroDelLimite(bytes: number): boolean {
  return Number.isFinite(bytes) && bytes > 0 && bytes <= BYTES_MAX_FOTO;
}

export function mensajeResultadoReporte(resultado: ResultadoIntentoReporte): string {
  if (resultado === 'enviado') return 'Reporte enviado. ¡Gracias!';
  if (resultado === 'encolado') {
    return 'Reporte guardado en el teléfono. Se va a enviar cuando haya conexión; todavía no está en el servidor.';
  }
  return 'No se pudo guardar el reporte.';
}

export function interpretarRespuestaReporte(codigo: string | null): ResultadoIntentoReporte {
  if (codigo === null) return 'enviado';
  if (esCodigoDuplicadoAceptable(codigo)) return 'enviado';
  if (esErrorTransitorio(codigo) || esErrorDeAuth(codigo)) return 'encolado';
  return 'rechazado';
}

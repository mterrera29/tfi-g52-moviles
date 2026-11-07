import { File, Directory, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

import { obtenerConexion } from '@/db/conexion';
import {
  actualizarReporte,
  eliminarReporte,
  guardarReporte,
  leerReportesPendientes,
} from '@/db/sqlite';
import { cliente, normalizarError } from '@/servicios/cliente';
import type { MotivoDemora, ReporteDeDemora, ReportePendiente } from '@/tipos/reporte';
import type { RespuestaError, RespuestaUno } from '@/tipos/api';

const CARPETA_REPORTES = 'reportes';

function directorioReportes(): Directory {
  const dir = new Directory(Paths.document, CARPETA_REPORTES);
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

export async function elegirFoto(): Promise<string | null> {
  const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permiso.granted) return null;

  const resultado = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.8,
  });

  if (resultado.canceled || !resultado.assets[0]) return null;
  return resultado.assets[0].uri;
}

export async function sacarFoto(): Promise<string | null> {
  const permiso = await ImagePicker.requestCameraPermissionsAsync();
  if (!permiso.granted) return null;

  const resultado = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.8,
  });

  if (resultado.canceled || !resultado.assets[0]) return null;
  return resultado.assets[0].uri;
}

export async function copiarFoto(uri: string): Promise<string> {
  const origen = new File(uri);
  const destino = new File(directorioReportes(), `${Date.now()}-${origen.name}`);
  await origen.copy(destino);
  return destino.uri;
}

function crearReportePendiente(
  datos: Omit<ReporteDeDemora, 'id' | 'confirmaciones' | 'sincronizado'> & { fotoUri?: string | null },
): ReportePendiente {
  const ahora = new Date().toISOString();
  return {
    ...datos,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    confirmaciones: 0,
    sincronizado: false,
    estado: 'pendiente',
    intentos: 0,
    creadoEn: ahora,
    actualizadoEn: ahora,
    fotoUri: datos.fotoUri ?? null,
  };
}

async function enviarAApi(reporte: ReportePendiente): Promise<RespuestaUno<ReporteDeDemora> | RespuestaError> {
  const formData = new FormData();
  formData.append('lineaId', reporte.lineaId);
  formData.append('paradaId', reporte.paradaId);
  formData.append('motivo', reporte.motivo);
  if (reporte.comentario) formData.append('comentario', reporte.comentario);
  if (reporte.fotoUri) {
    const archivo = new File(reporte.fotoUri);
    formData.append('foto', {
      uri: archivo.uri,
      name: archivo.name,
      type: 'image/jpeg',
    } as unknown as Blob);
  }

  try {
    const respuesta = await cliente.post<RespuestaUno<ReporteDeDemora>>('/reportes', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return respuesta.data;
  } catch (error) {
    return normalizarError(error);
  }
}

export async function enviarReporte(
  datos: Omit<ReporteDeDemora, 'id' | 'confirmaciones' | 'sincronizado'> & { fotoUri?: string | null },
): Promise<{ ok: true; encolado: boolean } | { ok: false; error: RespuestaError['error'] }> {
  const reporte = crearReportePendiente(datos);
  const db = obtenerConexion();

  const respuesta = await enviarAApi(reporte);
  if ('error' in respuesta) {
    if (respuesta.error.codigo === 'SIN_CONEXION') {
      await guardarReporte(db, reporte);
      return { ok: true, encolado: true };
    }
    return { ok: false, error: respuesta.error };
  }

  return { ok: true, encolado: false };
}

export async function procesarReportesPendientes(): Promise<number> {
  const db = obtenerConexion();
  const pendientes = await leerReportesPendientes(db);
  let enviados = 0;

  for (const reporte of pendientes) {
    const respuesta = await enviarAApi(reporte);
    if ('error' in respuesta) {
      if (respuesta.error.codigo === 'SIN_CONEXION') break;
      reporte.intentos += 1;
      reporte.actualizadoEn = new Date().toISOString();
      if (reporte.intentos >= 5) reporte.estado = 'error';
      await actualizarReporte(db, reporte);
      continue;
    }

    await eliminarReporte(db, reporte.id);
    enviados += 1;
  }

  return enviados;
}

export async function contarReportesPendientes(): Promise<number> {
  const db = obtenerConexion();
  const pendientes = await leerReportesPendientes(db);
  return pendientes.length;
}

export { MotivoDemora };

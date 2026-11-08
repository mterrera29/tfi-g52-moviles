import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import { obtenerConexion } from '@/db/conexion';
import {
  borrarVideoAviso,
  leerVideoAviso,
  persistirAviso,
  persistirVideoAviso,
  type VideoAvisoGuardado,
} from '@/db/sqlite';
import {
  completarDescargaVideo,
  descargaSigueValida,
  elegirFuenteVideo,
  urlVideoSegura,
} from '@/lib/videoAviso';
import type { Aviso } from '@/tipos/aviso';

function carpetaVideos(): Directory {
  return new Directory(Paths.document, 'videos-aviso');
}

function archivoDeAviso(avisoId: string): File {
  return new File(carpetaVideos(), `${avisoId}.mp4`);
}

function archivoTemporalDeAviso(avisoId: string): File {
  return new File(carpetaVideos(), `${avisoId}.part.mp4`);
}

function asegurarCarpeta(): Directory {
  const dir = carpetaVideos();
  if (!dir.exists) {
    dir.create({ idempotent: true });
  }
  return dir;
}

function borrarSiExiste(archivo: File): void {
  if (archivo.exists) {
    archivo.delete();
  }
}

export function estadoArchivoVideo(avisoId: string): { existe: boolean; bytes: number; uri: string } {
  if (Platform.OS === 'web') {
    return { existe: false, bytes: 0, uri: '' };
  }
  const archivo = archivoDeAviso(avisoId);
  return {
    existe: archivo.exists,
    bytes: archivo.exists ? archivo.size ?? 0 : 0,
    uri: archivo.uri,
  };
}

export async function leerDescargaVideo(avisoId: string): Promise<VideoAvisoGuardado | null> {
  return leerVideoAviso(obtenerConexion(), avisoId);
}

export async function fuenteDeAviso(aviso: Aviso): Promise<ReturnType<typeof elegirFuenteVideo>> {
  const descarga = await leerDescargaVideo(aviso.id);
  const archivo = estadoArchivoVideo(aviso.id);
  return elegirFuenteVideo({
    videoUrl: aviso.videoUrl,
    descarga,
    archivoExiste: archivo.existe,
    archivoBytes: archivo.bytes,
  });
}

export async function descargaDeAvisoEsLocal(aviso: Aviso): Promise<boolean> {
  const descarga = await leerDescargaVideo(aviso.id);
  const archivo = estadoArchivoVideo(aviso.id);
  return descargaSigueValida({
    videoUrl: aviso.videoUrl,
    descarga,
    archivoExiste: archivo.existe,
    archivoBytes: archivo.bytes,
  });
}

export async function guardarVideoAviso(aviso: Aviso): Promise<VideoAvisoGuardado> {
  if (Platform.OS === 'web') {
    throw new Error('En la web no se pueden guardar videos para verlos sin conexión.');
  }
  const url = urlVideoSegura(aviso.videoUrl);
  if (!url) {
    throw new Error('Este aviso no tiene un video para guardar.');
  }

  asegurarCarpeta();
  const temporal = archivoTemporalDeAviso(aviso.id);
  const destino = archivoDeAviso(aviso.id);
  borrarSiExiste(temporal);

  try {
    const { bytes } = await completarDescargaVideo({
      descargarTemporal: async () => {
        await File.downloadFileAsync(url, temporal, { idempotent: true });
        return { existe: temporal.exists, bytes: temporal.exists ? temporal.size ?? 0 : 0 };
      },
      borrarTemporal: async () => {
        borrarSiExiste(temporal);
      },
      promoverADefinitivo: async () => {
        await temporal.move(destino, { overwrite: true });
        return { existe: destino.exists, bytes: destino.exists ? destino.size ?? 0 : 0 };
      },
      invalidarDefinitivo: async () => {
        borrarSiExiste(destino);
      },
    });

    const registro: VideoAvisoGuardado = {
      avisoId: aviso.id,
      videoUrl: url,
      archivoUri: destino.uri,
      bytes,
    };
    const db = obtenerConexion();
    await persistirAviso(db, aviso);
    await persistirVideoAviso(db, registro);
    return registro;
  } catch (error) {
    const db = obtenerConexion();
    const previa = await leerVideoAviso(db, aviso.id);
    const estado = estadoArchivoVideo(aviso.id);
    if (
      !descargaSigueValida({
        videoUrl: url,
        descarga: previa,
        archivoExiste: estado.existe,
        archivoBytes: estado.bytes,
      })
    ) {
      borrarSiExiste(destino);
      await borrarVideoAviso(db, aviso.id);
    }
    if (error instanceof Error) throw error;
    throw new Error('No se pudo guardar el video.');
  }
}

export async function eliminarVideoAviso(avisoId: string): Promise<void> {
  if (Platform.OS !== 'web') {
    borrarSiExiste(archivoTemporalDeAviso(avisoId));
    borrarSiExiste(archivoDeAviso(avisoId));
  }
  await borrarVideoAviso(obtenerConexion(), avisoId);
}

import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import { BYTES_MAX_FOTO, fotoDentroDelLimite, mimeFotoPermitido } from '@/lib/colaReportes';
import type { RespuestaError } from '@/tipos/api';

function carpetaFotos(): Directory {
  return new Directory(Paths.document, 'fotos-reporte');
}

function asegurarCarpeta(): Directory {
  const dir = carpetaFotos();
  if (!dir.exists) {
    dir.create({ idempotent: true });
  }
  return dir;
}

function extensionDe(uri: string, mime: string | null): string {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  const match = uri.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  const ext = match?.[1]?.toLowerCase();
  if (ext === 'png' || ext === 'webp' || ext === 'jpg' || ext === 'jpeg') return ext === 'jpeg' ? 'jpg' : ext;
  return 'jpg';
}

function mimeDe(extension: string, mime: string | null): string {
  if (mime && mimeFotoPermitido(mime)) return mime;
  if (extension === 'png') return 'image/png';
  if (extension === 'webp') return 'image/webp';
  return 'image/jpeg';
}

function errorValidacion(mensaje: string): RespuestaError {
  return { error: { codigo: 'VALIDACION_FALLIDA', mensaje } };
}

export async function persistirFotoParaCola(
  origenUri: string,
  idReporte: string,
  mimeOrigen: string | null,
): Promise<{ uri: string; mime: string; bytes: number }> {
  if (Platform.OS === 'web') {
    throw errorValidacion('En la web no guardamos la foto en el teléfono para la cola.');
  }

  const extension = extensionDe(origenUri, mimeOrigen);
  const mime = mimeDe(extension, mimeOrigen);
  if (!mimeFotoPermitido(mime)) {
    throw errorValidacion('La foto tiene que ser JPEG, PNG o WebP.');
  }

  asegurarCarpeta();
  const destino = new File(carpetaFotos(), `${idReporte}.${extension}`);
  const origen = new File(origenUri);

  if (!origen.exists) {
    throw errorValidacion('No encontramos el archivo de la foto.');
  }

  const bytesOrigen = origen.size ?? 0;
  if (!fotoDentroDelLimite(bytesOrigen)) {
    throw errorValidacion(
      bytesOrigen > BYTES_MAX_FOTO
        ? 'La foto pesa más de 5 MB. Elegí otra o sacá una más chica.'
        : 'La foto está vacía o no se pudo leer.',
    );
  }

  if (destino.exists) destino.delete();
  await origen.copy(destino, { overwrite: true });

  const bytes = destino.size ?? 0;
  if (!fotoDentroDelLimite(bytes)) {
    if (destino.exists) destino.delete();
    throw errorValidacion('No se pudo copiar la foto al almacenamiento del teléfono.');
  }

  return { uri: destino.uri, mime, bytes };
}

export async function borrarFotoCola(uri: string | null): Promise<void> {
  if (!uri || Platform.OS === 'web') return;
  try {
    const archivo = new File(uri);
    if (archivo.exists) archivo.delete();
  } catch {
    // Si el archivo ya no está, la cola igual puede seguir.
  }
}

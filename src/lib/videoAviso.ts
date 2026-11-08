export type DescargaVideo = {
  videoUrl: string;
  archivoUri: string;
  bytes: number;
};

export type FuenteVideo =
  | { tipo: 'local'; uri: string }
  | { tipo: 'remoto'; uri: string }
  | { tipo: 'ninguna' };

export function urlVideoSegura(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
    return parsed.href;
  } catch {
    return null;
  }
}

export function elegirFuenteVideo({
  videoUrl,
  descarga,
  archivoExiste,
  archivoBytes,
}: {
  videoUrl: string | null;
  descarga: DescargaVideo | null;
  archivoExiste: boolean;
  archivoBytes: number;
}): FuenteVideo {
  const remoto = urlVideoSegura(videoUrl);
  // Igualdad de tamaño no detecta corrupción de contenido: solo descarta 0 bytes o recortes/tamaños distintos.
  const localValida =
    !!descarga &&
    archivoExiste &&
    archivoBytes > 0 &&
    descarga.bytes > 0 &&
    archivoBytes === descarga.bytes &&
    !!urlVideoSegura(descarga.videoUrl) &&
    remoto !== null &&
    descarga.videoUrl === remoto;

  if (localValida && descarga) {
    return { tipo: 'local', uri: descarga.archivoUri };
  }
  if (remoto) {
    return { tipo: 'remoto', uri: remoto };
  }
  return { tipo: 'ninguna' };
}

export function descargaSigueValida({
  videoUrl,
  descarga,
  archivoExiste,
  archivoBytes,
}: {
  videoUrl: string | null;
  descarga: DescargaVideo | null;
  archivoExiste: boolean;
  archivoBytes: number;
}): boolean {
  return elegirFuenteVideo({ videoUrl, descarga, archivoExiste, archivoBytes }).tipo === 'local';
}

export function archivoDescargaCompleto(existe: boolean, bytes: number): boolean {
  return existe && bytes > 0;
}

export function promocionDescargaValida(bytesTemporal: number, definitivoExiste: boolean, bytesDefinitivo: number): boolean {
  return (
    archivoDescargaCompleto(definitivoExiste, bytesDefinitivo) &&
    bytesDefinitivo === bytesTemporal
  );
}

export type IoDescargaVideo = {
  descargarTemporal: () => Promise<{ existe: boolean; bytes: number }>;
  borrarTemporal: () => Promise<void>;
  promoverADefinitivo: () => Promise<{ existe: boolean; bytes: number }>;
  invalidarDefinitivo: () => Promise<void>;
};

export async function completarDescargaVideo(io: IoDescargaVideo): Promise<{ bytes: number }> {
  let hayQueBorrarTemporal = true;
  try {
    const temporal = await io.descargarTemporal();
    if (!archivoDescargaCompleto(temporal.existe, temporal.bytes)) {
      throw new Error('No se pudo guardar el video. El archivo quedó vacío o incompleto.');
    }
    const definitivo = await io.promoverADefinitivo();
    hayQueBorrarTemporal = false;
    if (!promocionDescargaValida(temporal.bytes, definitivo.existe, definitivo.bytes)) {
      await io.invalidarDefinitivo();
      throw new Error('No se pudo guardar el video. El archivo no coincidió con lo descargado.');
    }
    return { bytes: definitivo.bytes };
  } catch (error) {
    if (hayQueBorrarTemporal) {
      await io.borrarTemporal().catch(() => {});
    }
    throw error;
  }
}

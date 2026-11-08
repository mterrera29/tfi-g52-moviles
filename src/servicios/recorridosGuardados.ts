import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import type { Linea } from '@/tipos/linea';

// Copia de los recorridos (trazado y paradas de cada sentido) como un archivo en el teléfono,
// para poder dibujar el mapa de una línea aunque no haya conexión.

function archivoRecorridos(): File {
  return new File(new Directory(Paths.document, 'mapas'), 'recorridos.json');
}

export function guardarRecorridos(lineas: Linea[]): void {
  if (Platform.OS === 'web') return;
  try {
    const carpeta = new Directory(Paths.document, 'mapas');
    if (!carpeta.exists) carpeta.create({ idempotent: true });
    const archivo = archivoRecorridos();
    if (!archivo.exists) archivo.create();
    archivo.write(JSON.stringify(lineas));
  } catch {
    // Es una copia de respaldo: si no se puede guardar, la app sigue igual.
  }
}

export async function leerRecorridosGuardados(): Promise<Linea[] | null> {
  if (Platform.OS === 'web') return null;
  try {
    const archivo = archivoRecorridos();
    if (!archivo.exists) return null;
    const lineas = JSON.parse(await archivo.text()) as Linea[];
    return Array.isArray(lineas) && lineas.length > 0 ? lineas : null;
  } catch {
    return null;
  }
}

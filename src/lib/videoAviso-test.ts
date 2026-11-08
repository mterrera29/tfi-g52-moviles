import { avisoVigente } from './avisoVigente';
import {
  completarDescargaVideo,
  descargaSigueValida,
  elegirFuenteVideo,
  urlVideoSegura,
} from './videoAviso';
import type { Aviso } from '../tipos/aviso';

function aviso(parcial: Partial<Aviso> & Pick<Aviso, 'id'>): Aviso {
  return {
    titulo: 'Aviso de prueba',
    detalle: 'Detalle',
    lineaIds: ['lin-02'],
    desde: '2026-11-01T00:00:00-03:00',
    hasta: null,
    gravedad: 'desvio',
    trazadoAlternativo: null,
    videoUrl: null,
    ...parcial,
  };
}

function igual<T>(obtenido: T, esperado: T, nombre: string) {
  if (obtenido !== esperado) {
    throw new Error(`${nombre}: se esperaba ${String(esperado)} y se obtuvo ${String(obtenido)}`);
  }
}

const pendientes: Promise<void>[] = [];

function test(nombre: string, fn: () => void | Promise<void>) {
  pendientes.push(
    Promise.resolve()
      .then(fn)
      .then(() => {
        console.log(`ok  ${nombre}`);
      }),
  );
}

const ahora = new Date('2026-11-06T12:00:00-03:00');

test('aviso vigente y vencido según desde/hasta', () => {
  igual(avisoVigente(aviso({ id: 'a', hasta: null }), ahora), true, 'abierto');
  igual(
    avisoVigente(aviso({ id: 'b', hasta: '2026-11-05T10:00:00-03:00' }), ahora),
    false,
    'vencido',
  );
  igual(
    avisoVigente(aviso({ id: 'c', desde: '2026-11-10T00:00:00-03:00' }), ahora),
    false,
    'futuro',
  );
});

test('urlVideoSegura solo acepta http(s)', () => {
  igual(urlVideoSegura(null), null, 'null');
  igual(urlVideoSegura(''), null, 'vacía');
  igual(urlVideoSegura('javascript:alert(1)'), null, 'javascript');
  igual(urlVideoSegura('ftp://files.example/video.mp4'), null, 'ftp');
  igual(
    urlVideoSegura('https://media.invalid.test/desvio-placeholder.mp4'),
    'https://media.invalid.test/desvio-placeholder.mp4',
    'https placeholder',
  );
});

// PLACEHOLDER DE TEST: no es un video real de la API de la cátedra.
const URL_PLACEHOLDER = 'https://media.invalid.test/desvio-placeholder.mp4';
const URL_CAMBIADA = 'https://media.invalid.test/desvio-placeholder-v2.mp4';
const ARCHIVO_PLACEHOLDER = 'file:///data/videos-aviso/avi-088.mp4';

test('elige archivo local solo si existe, tiene bytes y la URL coincide', () => {
  const fuente = elegirFuenteVideo({
    videoUrl: URL_PLACEHOLDER,
    descarga: { videoUrl: URL_PLACEHOLDER, archivoUri: ARCHIVO_PLACEHOLDER, bytes: 1200 },
    archivoExiste: true,
    archivoBytes: 1200,
  });
  igual(fuente.tipo, 'local', 'tipo');
  if (fuente.tipo === 'local') igual(fuente.uri, ARCHIVO_PLACEHOLDER, 'uri local');
});

test('archivo ausente o de 0 bytes no se afirma descargado', () => {
  igual(
    elegirFuenteVideo({
      videoUrl: URL_PLACEHOLDER,
      descarga: { videoUrl: URL_PLACEHOLDER, archivoUri: ARCHIVO_PLACEHOLDER, bytes: 1200 },
      archivoExiste: false,
      archivoBytes: 0,
    }).tipo,
    'remoto',
    'ausente',
  );
  igual(
    elegirFuenteVideo({
      videoUrl: URL_PLACEHOLDER,
      descarga: { videoUrl: URL_PLACEHOLDER, archivoUri: ARCHIVO_PLACEHOLDER, bytes: 0 },
      archivoExiste: true,
      archivoBytes: 0,
    }).tipo,
    'remoto',
    'vacío',
  );
  igual(
    descargaSigueValida({
      videoUrl: URL_PLACEHOLDER,
      descarga: { videoUrl: URL_PLACEHOLDER, archivoUri: ARCHIVO_PLACEHOLDER, bytes: 1200 },
      archivoExiste: false,
      archivoBytes: 0,
    }),
    false,
    'no válida',
  );
});

test('si cambió videoUrl no se usa el archivo viejo', () => {
  const fuente = elegirFuenteVideo({
    videoUrl: URL_CAMBIADA,
    descarga: { videoUrl: URL_PLACEHOLDER, archivoUri: ARCHIVO_PLACEHOLDER, bytes: 1200 },
    archivoExiste: true,
    archivoBytes: 1200,
  });
  igual(fuente.tipo, 'remoto', 'usa remoto');
  if (fuente.tipo === 'remoto') igual(fuente.uri, URL_CAMBIADA, 'url nueva');
});

test('sin videoUrl no hay player', () => {
  igual(
    elegirFuenteVideo({
      videoUrl: null,
      descarga: null,
      archivoExiste: false,
      archivoBytes: 0,
    }).tipo,
    'ninguna',
    'ninguna',
  );
});

test('archivo con menos bytes que la metadata no se trata como guardado', () => {
  igual(
    elegirFuenteVideo({
      videoUrl: URL_PLACEHOLDER,
      descarga: { videoUrl: URL_PLACEHOLDER, archivoUri: ARCHIVO_PLACEHOLDER, bytes: 1200 },
      archivoExiste: true,
      archivoBytes: 800,
    }).tipo,
    'remoto',
    'truncado',
  );
});

test('archivo con bytes distintos (más) tampoco se trata como guardado', () => {
  igual(
    elegirFuenteVideo({
      videoUrl: URL_PLACEHOLDER,
      descarga: { videoUrl: URL_PLACEHOLDER, archivoUri: ARCHIVO_PLACEHOLDER, bytes: 1200 },
      archivoExiste: true,
      archivoBytes: 1500,
    }).tipo,
    'remoto',
    'distintos',
  );
});

test('simulacro I/O: fallo de descarga limpia el temporal y no promueve', async () => {
  const llamadas: string[] = [];
  let fallo: unknown = null;
  try {
    await completarDescargaVideo({
      descargarTemporal: async () => {
        llamadas.push('descargar');
        throw new Error('red caída');
      },
      borrarTemporal: async () => {
        llamadas.push('borrar-temp');
      },
      promoverADefinitivo: async () => {
        llamadas.push('promover');
        return { existe: true, bytes: 1200 };
      },
      invalidarDefinitivo: async () => {
        llamadas.push('invalidar');
      },
    });
  } catch (error) {
    fallo = error;
  }
  igual(fallo instanceof Error, true, 'lanza');
  igual(llamadas.join(','), 'descargar,borrar-temp', 'no toca el definitivo');
});

test('simulacro I/O: temporal vacío no se promueve', async () => {
  const llamadas: string[] = [];
  let fallo: unknown = null;
  try {
    await completarDescargaVideo({
      descargarTemporal: async () => {
        llamadas.push('descargar');
        return { existe: true, bytes: 0 };
      },
      borrarTemporal: async () => {
        llamadas.push('borrar-temp');
      },
      promoverADefinitivo: async () => {
        llamadas.push('promover');
        return { existe: true, bytes: 0 };
      },
      invalidarDefinitivo: async () => {
        llamadas.push('invalidar');
      },
    });
  } catch (error) {
    fallo = error;
  }
  igual(fallo instanceof Error, true, 'lanza');
  igual(llamadas.join(','), 'descargar,borrar-temp', 'no promueve incompleto');
});

test('simulacro I/O: promoción con bytes distintos invalida el definitivo', async () => {
  const llamadas: string[] = [];
  let fallo: unknown = null;
  try {
    await completarDescargaVideo({
      descargarTemporal: async () => {
        llamadas.push('descargar');
        return { existe: true, bytes: 1200 };
      },
      borrarTemporal: async () => {
        llamadas.push('borrar-temp');
      },
      promoverADefinitivo: async () => {
        llamadas.push('promover');
        return { existe: true, bytes: 800 };
      },
      invalidarDefinitivo: async () => {
        llamadas.push('invalidar');
      },
    });
  } catch (error) {
    fallo = error;
  }
  igual(fallo instanceof Error, true, 'lanza');
  igual(llamadas.join(','), 'descargar,promover,invalidar', 'invalida el archivo corto');
});

test('simulacro I/O: éxito no borra ni invalida', async () => {
  const resultado = await completarDescargaVideo({
    descargarTemporal: async () => ({ existe: true, bytes: 1200 }),
    borrarTemporal: async () => {
      throw new Error('no debería borrar');
    },
    promoverADefinitivo: async () => ({ existe: true, bytes: 1200 }),
    invalidarDefinitivo: async () => {
      throw new Error('no debería invalidar');
    },
  });
  igual(resultado.bytes, 1200, 'bytes finales');
});

void Promise.all(pendientes)
  .then(() => {
    console.log('Todos los casos de video de avisos pasaron.');
    console.log(
      'Nota: estos tests son puros (sin FileSystem ni teléfono). Simulan I/O. No cubren descarga real, File API ni reproducción.',
    );
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });


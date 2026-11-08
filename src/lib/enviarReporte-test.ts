import { crearExclusionDrenaje, drenarCola, enviarUnItem, type DependenciasEnvioReporte } from './enviarReporte';
import type { ItemColaReporte } from './colaReportes';

function igual<T>(obtenido: T, esperado: T, nombre: string) {
  if (obtenido !== esperado) {
    throw new Error(`${nombre}: se esperaba ${String(esperado)} y se obtuvo ${String(obtenido)}`);
  }
}

const pendientes: Promise<void>[] = [];

function test(nombre: string, fn: () => void | Promise<void>) {
  pendientes.push(
    Promise.resolve(fn()).then(() => {
      console.log(`ok  ${nombre}`);
    }),
  );
}

function item(parcial: Partial<ItemColaReporte> = {}): ItemColaReporte {
  return {
    id: 'rep-1',
    usuarioId: 'usr-320',
    lineaId: 'lin-05',
    paradaId: 'par-101',
    motivo: 'demorado',
    comentario: 'tarde',
    fotoLocalUri: 'file:///local.jpg',
    fotoRemotaUri: null,
    fechaHora: '2026-11-08T12:00:00.000Z',
    intentos: 0,
    lastErrorCodigo: null,
    ...parcial,
  };
}

function deps(parcial: Partial<DependenciasEnvioReporte> = {}): DependenciasEnvioReporte & {
  persistidos: ItemColaReporte[];
  borrados: string[];
  posts: unknown[];
} {
  const persistidos: ItemColaReporte[] = [];
  const borrados: string[] = [];
  const posts: unknown[] = [];
  return {
    persistidos,
    borrados,
    posts,
    subirArchivo: async () => 'https://api.example/archivos/a.jpg',
    crearReporte: async (cuerpo) => {
      posts.push(cuerpo);
      return null;
    },
    persistirItem: async (actual) => {
      persistidos.push(actual);
    },
    borrarItem: async (id) => {
      borrados.push(id);
    },
    ...parcial,
  };
}

test('sube POST /archivos y después /reportes-demora con fotoUri remota', async () => {
  const pasos: string[] = [];
  const d = deps({
    subirArchivo: async () => {
      pasos.push('archivo');
      return 'https://api.example/archivos/a.jpg';
    },
    crearReporte: async (cuerpo) => {
      pasos.push('reporte');
      igual(cuerpo.fotoUri, 'https://api.example/archivos/a.jpg', 'fotoUri');
      igual(cuerpo.id, 'rep-1', 'id');
      return null;
    },
  });
  const { resultado } = await enviarUnItem(item(), d);
  igual(resultado, 'enviado', 'resultado');
  igual(pasos.join(','), 'archivo,reporte', 'orden');
  igual(d.borrados.includes('rep-1'), true, 'sale de la cola');
});

test('si ya hay URL remota no vuelve a subir el archivo', async () => {
  let subidas = 0;
  const d = deps({
    subirArchivo: async () => {
      subidas += 1;
      return 'x';
    },
  });
  await enviarUnItem(item({ fotoRemotaUri: 'https://api.example/archivos/a.jpg' }), d);
  igual(subidas, 0, 'sin reupload');
});

test('timeout/sin red deja el ítem en cola y no lo borra', async () => {
  const d = deps({
    crearReporte: async () => {
      throw { error: { codigo: 'SIN_CONEXION', mensaje: 'sin red' } };
    },
  });
  const { resultado } = await enviarUnItem(item({ fotoLocalUri: null }), d);
  igual(resultado, 'encolado', 'queda pendiente');
  igual(d.borrados.length, 0, 'no borra');
  igual(d.persistidos.at(-1)?.lastErrorCodigo, 'SIN_CONEXION', 'guarda error');
});

test('ID_EN_USO después de un reintento cuenta como enviado', async () => {
  const d = deps({
    crearReporte: async () => 'ID_EN_USO',
  });
  const { resultado } = await enviarUnItem(item({ fotoLocalUri: null }), d);
  igual(resultado, 'enviado', 'duplicado aceptable');
  igual(d.borrados.includes('rep-1'), true, 'sale de cola');
});

test('sesión inválida no pierde el ítem y corta el drenaje', async () => {
  const d = deps({
    crearReporte: async () => {
      throw { error: { codigo: 'NO_AUTENTICADO', mensaje: 'login' } };
    },
  });
  const resumen = await drenarCola(
    [item({ fotoLocalUri: null }), item({ id: 'rep-2', fotoLocalUri: null })],
    'usr-320',
    d,
  );
  igual(resumen.detener, true, 'corta');
  igual(d.borrados.length, 0, 'no pierde');
  igual(resumen.enviados, 0, 'nada enviado');
});

test('no drena reportes de otro usuario', async () => {
  const d = deps();
  const resumen = await drenarCola([item({ usuarioId: 'usr-otro', fotoLocalUri: null })], 'usr-320', d);
  igual(resumen.omitidos, 1, 'omitido');
  igual(d.posts.length, 0, 'sin POST');
});

test('exclusión: dos drenajes no corren en paralelo', async () => {
  const exclusion = crearExclusionDrenaje();
  let enCurso = 0;
  let max = 0;
  const trabajo = () =>
    exclusion(async () => {
      enCurso += 1;
      max = Math.max(max, enCurso);
      await new Promise((r) => setTimeout(r, 20));
      enCurso -= 1;
    });
  await Promise.all([trabajo(), trabajo()]);
  igual(max, 1, 'nunca dos a la vez');
});

Promise.all(pendientes)
  .then(() => {
    console.log('Todos los casos de envío de reportes pasaron.');
    console.log('Mocks locales: no hay POST real a /archivos ni /reportes-demora.');
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });

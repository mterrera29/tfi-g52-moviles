import {
  cuerpoPostReporteDemora,
  debeDrenarItem,
  esCodigoDuplicadoAceptable,
  fotoDentroDelLimite,
  idReporteConFormato,
  interpretarRespuestaReporte,
  mensajeResultadoReporte,
  mimeFotoPermitido,
  nuevoIdReporte,
  type ItemColaReporte,
} from './colaReportes';

function igual<T>(obtenido: T, esperado: T, nombre: string) {
  if (obtenido !== esperado) {
    throw new Error(`${nombre}: se esperaba ${String(esperado)} y se obtuvo ${String(obtenido)}`);
  }
}

function test(nombre: string, fn: () => void) {
  fn();
  console.log(`ok  ${nombre}`);
}

function item(parcial: Partial<ItemColaReporte> = {}): ItemColaReporte {
  return {
    id: 'rep-abc',
    usuarioId: 'usr-320',
    lineaId: 'lin-05',
    paradaId: 'par-101',
    motivo: 'demorado',
    comentario: null,
    fotoLocalUri: null,
    fotoRemotaUri: null,
    fechaHora: '2026-11-08T12:00:00.000Z',
    intentos: 0,
    lastErrorCodigo: null,
    ...parcial,
  };
}

test('ids de reporte usan prefijo rep- de la API demo', () => {
  const id = nuevoIdReporte(1_736_000_000_000, 'aB12zz');
  igual(id.startsWith('rep-'), true, 'prefijo');
  igual(idReporteConFormato(id), true, 'formato');
  igual(idReporteConFormato('rep-3394'), true, 'demo');
  igual(idReporteConFormato('3394'), false, 'sin prefijo');
});

test('POST /reportes-demora manda fotoUri remota, no el archivo local', () => {
  const cuerpo = cuerpoPostReporteDemora(
    item({
      fotoLocalUri: 'file:///data/fotos/rep-abc.jpg',
      fotoRemotaUri: 'https://api.example/archivos/foto.jpg',
    }),
  );
  igual(cuerpo.fotoUri, 'https://api.example/archivos/foto.jpg', 'url remota');
  igual('usuarioId' in cuerpo, false, 'usuario sale del token');
  igual('sincronizado' in cuerpo, false, 'sincronizado es local');
  igual(cuerpo.id, 'rep-abc', 'id del teléfono');
  igual(cuerpo.lineaId, 'lin-05', 'linea');
  igual(cuerpo.paradaId, 'par-101', 'parada');
});

test('duplicado de la API se trata como enviado, no como fallo', () => {
  igual(esCodigoDuplicadoAceptable('ID_EN_USO'), true, 'id en uso');
  igual(esCodigoDuplicadoAceptable('REPORTE_YA_ENVIADO'), true, 'ya enviado');
  igual(interpretarRespuestaReporte('ID_EN_USO'), 'enviado', 'interpreta duplicado');
  igual(interpretarRespuestaReporte(null), 'enviado', '201/200');
  igual(interpretarRespuestaReporte('SIN_CONEXION'), 'encolado', 'sin red');
  igual(interpretarRespuestaReporte('NO_AUTENTICADO'), 'encolado', 'sesión caída: no se pierde');
  igual(interpretarRespuestaReporte('LINEA_NO_PARA_EN_PARADA'), 'rechazado', 'validación');
});

test('no se anuncia enviado si sólo quedó encolado', () => {
  igual(mensajeResultadoReporte('enviado').includes('enviado'), true, 'enviado');
  igual(mensajeResultadoReporte('encolado').includes('todavía no está en el servidor'), true, 'encolado honesto');
  igual(mensajeResultadoReporte('encolado').includes('enviado. ¡Gracias'), false, 'no miente');
});

test('drenaje sólo del usuario de la sesión y no pisa validaciones', () => {
  igual(debeDrenarItem(item(), null), false, 'sin sesión');
  igual(debeDrenarItem(item(), 'usr-otro'), false, 'otro usuario');
  igual(debeDrenarItem(item(), 'usr-320'), true, 'mismo usuario');
  igual(
    debeDrenarItem(item({ lastErrorCodigo: 'LINEA_NO_PARA_EN_PARADA' }), 'usr-320'),
    false,
    'no reintenta validación',
  );
  igual(debeDrenarItem(item({ lastErrorCodigo: 'SIN_CONEXION' }), 'usr-320'), true, 'sí reintenta red');
});

test('foto: mime y tamaño del contrato (5 MB jpeg/png/webp)', () => {
  igual(mimeFotoPermitido('image/jpeg'), true, 'jpeg');
  igual(mimeFotoPermitido('image/png'), true, 'png');
  igual(mimeFotoPermitido('image/webp'), true, 'webp');
  igual(mimeFotoPermitido('video/mp4'), false, 'no video');
  igual(fotoDentroDelLimite(5 * 1024 * 1024), true, '5 MB');
  igual(fotoDentroDelLimite(5 * 1024 * 1024 + 1), false, 'de más');
  igual(fotoDentroDelLimite(0), false, 'vacío');
});

test('simulacro de cola: orden archivo→reporte y un solo upload por ítem', () => {
  const llamadas: string[] = [];
  const items = [
    item({ id: 'rep-1', fotoLocalUri: 'file://a.jpg', fotoRemotaUri: null }),
    item({ id: 'rep-2' }),
  ];
  for (const actual of items) {
    if (!debeDrenarItem(actual, 'usr-320')) continue;
    if (actual.fotoLocalUri && !actual.fotoRemotaUri) {
      llamadas.push(`archivo:${actual.id}`);
      actual.fotoRemotaUri = 'https://api.example/a.jpg';
    }
    llamadas.push(`reporte:${actual.id}`);
  }
  igual(llamadas.filter((c) => c.startsWith('archivo')).length, 1, 'un upload');
  igual(llamadas.indexOf('archivo:rep-1') < llamadas.indexOf('reporte:rep-1'), true, 'archivo antes');
  igual(llamadas.includes('reporte:rep-2'), true, 'segundo sin foto');
});

console.log('Todos los casos de cola de reportes pasaron.');
console.log(
  'Nota: tests puros/mocks de contrato. No hablan con la API ni crean reportes reales. No cubren cámara ni háptica del teléfono.',
);

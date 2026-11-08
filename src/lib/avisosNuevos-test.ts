import { destinoDesdeRuta, resolverAvisosNuevos, rutaNotificacionValida } from './avisosNuevos';
import type { Aviso } from '../tipos/aviso';

function igual<T>(obtenido: T, esperado: T, nombre: string) {
  if (obtenido !== esperado) {
    throw new Error(`${nombre}: se esperaba ${String(esperado)} y se obtuvo ${String(obtenido)}`);
  }
}

function test(nombre: string, fn: () => void) {
  fn();
  console.log(`ok  ${nombre}`);
}

function aviso(parcial: Partial<Aviso> & Pick<Aviso, 'id'>): Aviso {
  return {
    titulo: 'Desvío',
    detalle: 'Obra',
    lineaIds: ['lin-05'],
    desde: '2026-11-01T00:00:00.000Z',
    hasta: null,
    gravedad: 'desvio',
    trazadoAlternativo: null,
    videoUrl: null,
    ...parcial,
  };
}

const ahora = new Date('2026-11-08T15:00:00.000Z');

test('la primera carga siembra y no notifica avisos viejos', () => {
  const r = resolverAvisosNuevos({
    avisos: [aviso({ id: 'avi-1' })],
    lineasFavoritas: ['lin-05'],
    avisosActivos: true,
    idsVistos: null,
    ahora,
  });
  igual(r.accion, 'sembrar', 'siembra');
  igual(r.ids.join(','), 'avi-1', 'ids');
});

test('un aviso nuevo de línea favorita se notifica una vez', () => {
  const r = resolverAvisosNuevos({
    avisos: [aviso({ id: 'avi-1' }), aviso({ id: 'avi-2' })],
    lineasFavoritas: ['lin-05'],
    avisosActivos: true,
    idsVistos: ['avi-1'],
    ahora,
  });
  igual(r.accion, 'notificar', 'notifica');
  if (r.accion !== 'notificar') throw new Error('accion');
  igual(r.avisos.map((a) => a.id).join(','), 'avi-2', 'solo el nuevo');
});

test('no notifica si avisosActivos está apagado', () => {
  const r = resolverAvisosNuevos({
    avisos: [aviso({ id: 'avi-2' })],
    lineasFavoritas: ['lin-05'],
    avisosActivos: false,
    idsVistos: ['avi-1'],
    ahora,
  });
  igual(r.accion, 'nada', 'apagado');
});

test('no notifica avisos de líneas que no son favoritas ni vencidos', () => {
  const r = resolverAvisosNuevos({
    avisos: [
      aviso({ id: 'avi-otra', lineaIds: ['lin-99'] }),
      aviso({ id: 'avi-viejo', desde: '2020-01-01T00:00:00.000Z', hasta: '2020-01-02T00:00:00.000Z' }),
    ],
    lineasFavoritas: ['lin-05'],
    avisosActivos: true,
    idsVistos: [],
    ahora,
  });
  igual(r.accion, 'nada', 'fuera de alcance');
});

test('el toque sólo navega a rutas de parada, aviso o línea', () => {
  igual(rutaNotificacionValida('/parada/par-101'), true, 'parada');
  igual(rutaNotificacionValida('/aviso/avi-1'), true, 'aviso');
  igual(rutaNotificacionValida('/linea/lin-05'), true, 'linea');
  igual(rutaNotificacionValida('https://evil.example'), false, 'url');
  igual(rutaNotificacionValida('/login'), false, 'login');
  igual(destinoDesdeRuta('/aviso/avi-1')?.pathname, '/aviso/[id]', 'destino');
});

console.log('Todos los casos de avisos nuevos pasaron.');

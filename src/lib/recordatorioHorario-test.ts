import { instanteParana } from './zonaParana';
import {
  MINUTOS_ANTES_RECORDATORIO,
  calcularRecordatorio,
  claveRecordatorio,
  instanteRecordatorioTabla,
  type PedidoRecordatorio,
} from './recordatorioHorario';

function igual<T>(obtenido: T, esperado: T, nombre: string) {
  if (obtenido !== esperado) {
    throw new Error(`${nombre}: se esperaba ${String(esperado)} y se obtuvo ${String(obtenido)}`);
  }
}

function test(nombre: string, fn: () => void) {
  fn();
  console.log(`ok  ${nombre}`);
}

function pedido(parcial: Partial<PedidoRecordatorio> = {}): PedidoRecordatorio {
  return {
    paradaId: 'par-101',
    paradaNombre: 'Alameda y Urquiza',
    horarioId: 'hor-1',
    lineaId: 'lin-05',
    lineaNumero: '5',
    hora: '07:15',
    fechaServicio: '2026-11-09',
    minutosRestantes: 40,
    ...parcial,
  };
}

test('el disparo es 10 min antes de la hora de tabla en Paraná, no GPS', () => {
  const paso = instanteParana('2026-11-09', '07:15');
  const disparo = instanteRecordatorioTabla('2026-11-09', '07:15');
  if (!paso || !disparo) throw new Error('instantes');
  igual(disparo.getTime(), paso.getTime() - MINUTOS_ANTES_RECORDATORIO * 60_000, 'menos 10 min');
});

test('rechaza si no hay fecha de servicio (no inventa día local del teléfono)', () => {
  const r = calcularRecordatorio(pedido({ fechaServicio: null }), new Date('2026-11-09T09:00:00.000Z'));
  igual(r.ok, false, 'sin fecha');
});

test('rechaza si ya faltan menos de 10 min según la tabla', () => {
  const r = calcularRecordatorio(pedido({ minutosRestantes: 9 }), new Date('2026-11-09T10:06:00.000Z'));
  igual(r.ok, false, 'tarde');
});

test('arma clave estable para cancelar/reprogramar sin duplicar', () => {
  igual(
    claveRecordatorio('par-101', 'hor-1', '2026-11-09', '07:15'),
    'rec-par-101-hor-1-2026-11-09-0715',
    'clave',
  );
  const ahora = new Date(instanteRecordatorioTabla('2026-11-09', '07:15')!.getTime() - 60_000);
  const r = calcularRecordatorio(pedido(), ahora);
  if (!r.ok) throw new Error(r.motivo);
  igual(r.recordatorio.ruta, '/parada/par-101', 'ruta');
  igual(r.recordatorio.cuerpo.includes('según la tabla'), true, 'honestidad');
  igual(r.recordatorio.cuerpo.includes('GPS'), true, 'no GPS');
});

test('medianoche: 00:10 usa el día de servicio, no resta HH:mm a ciegas', () => {
  const paso = instanteParana('2026-11-10', '00:10');
  const disparo = instanteRecordatorioTabla('2026-11-10', '00:10');
  if (!paso || !disparo) throw new Error('medianoche');
  igual(disparo.getTime(), paso.getTime() - 10 * 60_000, '10 min antes de 00:10');
});

console.log('Todos los casos de recordatorio de horario pasaron.');

import type { Horario } from '../tipos/horario';
import { elegirTipoDeDia } from './tipoDeDia';
import {
  anotarProximosDeApi,
  formatearMinutosRestantes,
  mensajeSinProximosServicio,
  proximosHorariosDesdeTabla,
  resolverProximosParada,
  textoHorarioSegunTabla,
  type OpcionesProximosParada,
} from './proximosHorarios';
import { instanteParana, partesParana } from './zonaParana';

function horario(parcial: Partial<Horario> & Pick<Horario, 'id' | 'hora' | 'tipoDeDia'>): Horario {
  return {
    lineaId: 'lin-05',
    paradaId: 'par-101',
    sentido: 'ida',
    ...parcial,
  };
}

function igual<T>(obtenido: T, esperado: T, nombre: string) {
  if (obtenido !== esperado) {
    throw new Error(`${nombre}: se esperaba ${String(esperado)} y se obtuvo ${String(obtenido)}`);
  }
}

function test(nombre: string, fn: () => void) {
  fn();
  console.log(`ok  ${nombre}`);
}

function opciones(parcial: Partial<OpcionesProximosParada> & Pick<OpcionesProximosParada, 'ahora'>): OpcionesProximosParada {
  return {
    tablas: [],
    fallbackApi: [],
    feriados: [],
    cantidad: 3,
    obtenidoEn: parcial.ahora,
    calendarioListo: true,
    tablasCompletas: true,
    ...parcial,
  };
}

const feriadoSabado = [{ fecha: '2026-06-20', nombre: 'Feriado' }];

test('viernes hábil: minutos hasta el próximo de hoy', () => {
  const ahora = new Date('2026-11-06T10:40:00-03:00');
  const tablas = [
    horario({ id: 'h1', hora: '10:42', tipoDeDia: 'habil' }),
    horario({ id: 'h2', hora: '11:02', tipoDeDia: 'habil' }),
  ];
  const proximos = proximosHorariosDesdeTabla(tablas, [], 3, ahora);
  igual(proximos.length, 3, 'cantidad');
  igual(proximos[0].horario.hora, '10:42', 'hora');
  igual(proximos[0].fechaServicio, '2026-11-06', 'fecha');
  igual(proximos[0].minutosRestantes, 2, 'minutos 10:42');
  igual(proximos[1].minutosRestantes, 22, 'minutos 11:02');
  igual(proximos[2].fechaServicio, '2026-11-09', 'próximo hábil el lunes');
  igual(proximos[2].horario.hora, '10:42', 'hora del lunes');
});

test('no resta HH:mm a ciegas cuando el próximo es mañana', () => {
  const ahora = new Date('2026-11-06T22:00:00-03:00');
  const tablas = [
    horario({ id: 'h1', hora: '21:00', tipoDeDia: 'habil' }),
    horario({ id: 'h2', hora: '05:20', tipoDeDia: 'sabado' }),
  ];
  const proximos = proximosHorariosDesdeTabla(tablas, [], 1, ahora);
  igual(proximos[0].horario.hora, '05:20', 'hora mañana');
  igual(proximos[0].fechaServicio, '2026-11-07', 'fecha mañana');
  igual(proximos[0].minutosRestantes, 7 * 60 + 20, 'minutos reales');
  const naive = 5 * 60 + 20 - 22 * 60;
  if (proximos[0].minutosRestantes === naive) {
    throw new Error('no debería coincidir con la resta naive de HH:mm');
  }
});

test('medianoche: 00:10 es del día calendario siguiente', () => {
  const ahora = new Date('2026-11-06T23:50:00-03:00');
  const tablas = [
    horario({ id: 'h1', hora: '23:40', tipoDeDia: 'habil' }),
    horario({ id: 'h2', hora: '00:10', tipoDeDia: 'sabado' }),
  ];
  const proximos = proximosHorariosDesdeTabla(tablas, [], 1, ahora);
  igual(proximos[0].fechaServicio, '2026-11-07', 'fecha');
  igual(proximos[0].horario.hora, '00:10', 'hora');
  igual(proximos[0].minutosRestantes, 20, 'minutos');
});

test('hora ya pasada en segundos no se ofrece como próxima', () => {
  const ahora = new Date('2026-11-06T10:42:30-03:00');
  const tablas = [horario({ id: 'h1', hora: '10:42', tipoDeDia: 'habil' })];
  const proximos = proximosHorariosDesdeTabla(tablas, [], 3, ahora);
  igual(
    proximos.every((item) => item.fechaServicio !== '2026-11-06'),
    true,
    'ya pasó hoy',
  );
  igual(proximos[0]?.fechaServicio, '2026-11-09', 'pasa al próximo hábil');
});

test('feriado que cae sábado usa la tabla feriado, no la de sábado', () => {
  const ahora = new Date('2026-06-20T10:00:00-03:00');
  const tablas = [
    horario({ id: 'sab', hora: '08:00', tipoDeDia: 'sabado' }),
    horario({ id: 'fer', hora: '10:30', tipoDeDia: 'feriado' }),
  ];
  const proximos = proximosHorariosDesdeTabla(tablas, feriadoSabado, 1, ahora);
  igual(proximos[0].horario.id, 'fer', 'id feriado');
  igual(proximos[0].minutosRestantes, 30, 'minutos');
  igual(elegirTipoDeDia(ahora, feriadoSabado), 'feriado', 'tipo');
});

test('sábado de noche sin domingo: el próximo real es el lunes hábil', () => {
  const ahora = new Date('2026-11-07T22:00:00-03:00');
  const tablas = [
    horario({ id: 'vie', hora: '21:00', tipoDeDia: 'habil' }),
    horario({ id: 'lun', hora: '05:20', tipoDeDia: 'habil' }),
  ];
  const proximos = proximosHorariosDesdeTabla(tablas, [], 1, ahora);
  igual(proximos[0].fechaServicio, '2026-11-09', 'lunes');
  igual(proximos[0].horario.hora, '05:20', 'hora lunes');
  const resuelto = resolverProximosParada(opciones({ ahora, tablas }));
  igual(resuelto.hoyAgotado, true, 'hoy agotado');
  igual(
    resuelto.mensajeHoyAgotado,
    'No hay más servicio hasta el 09/11/2026 a las 05:20',
    'mensaje',
  );
});

test('horizonte incluye el mismo día de la semana siguiente', () => {
  const ahora = new Date('2026-11-07T22:00:00-03:00');
  const tablas = [horario({ id: 'sab', hora: '08:00', tipoDeDia: 'sabado' })];
  const proximos = proximosHorariosDesdeTabla(tablas, [], 1, ahora);
  igual(proximos[0].fechaServicio, '2026-11-14', 'próximo sábado');
  igual(proximos[0].horario.hora, '08:00', 'hora');
});

test('UTC de madrugada sigue siendo viernes en Paraná', () => {
  const ahora = new Date('2026-11-07T01:30:00.000Z');
  igual(partesParana(ahora).ymd, '2026-11-06', 'ymd Paraná');
  igual(elegirTipoDeDia(ahora, []), 'habil', 'sigue hábil');
});

test('API en el instante de obtención: hora menor y tipo de mañana se ancla a mañana', () => {
  const obtenidoEn = new Date('2026-11-06T22:00:00-03:00');
  const api = [horario({ id: 'h2', hora: '05:20', tipoDeDia: 'sabado' })];
  const anotados = anotarProximosDeApi(api, [], obtenidoEn, obtenidoEn);
  igual(anotados[0].fechaServicio, '2026-11-07', 'fecha api');
  igual(anotados[0].etiquetaDia, 'mañana', 'etiqueta');
  igual(anotados[0].minutosRestantes, 7 * 60 + 20, 'minutos api');
});

test('respuesta envejecida: al pasar las 10:42 no se re-fecha a mañana', () => {
  const obtenidoEn = new Date('2026-11-06T10:40:00-03:00');
  const ahora = new Date('2026-11-06T10:43:00-03:00');
  const api = [horario({ id: 'h1', hora: '10:42', tipoDeDia: 'habil' })];
  const anotados = anotarProximosDeApi(api, [], obtenidoEn, ahora);
  igual(anotados.length, 0, 'vencido se filtra');
  const resuelto = resolverProximosParada(
    opciones({
      ahora,
      obtenidoEn,
      fallbackApi: api,
      tablasCompletas: false,
    }),
  );
  igual(resuelto.proximos.length, 0, 'lista vacía');
  igual(resuelto.hoyAgotado, false, 'no afirma fin de servicio');
  igual(resuelto.mensajeHoyAgotado, null, 'sin hasta mañana');
  igual(resuelto.mensajeVacio, 'No hay próximos servicios para esta parada.', 'vacío genérico');
});

test('respuesta envejecida: cruzar medianoche no re-fecha el snapshot', () => {
  const obtenidoEn = new Date('2026-11-06T10:40:00-03:00');
  const ahora = new Date('2026-11-07T00:10:00-03:00');
  const api = [horario({ id: 'h1', hora: '10:42', tipoDeDia: 'habil' })];
  const anotados = anotarProximosDeApi(api, [], obtenidoEn, ahora);
  igual(anotados.length, 0, 'el 10:42 de ayer no pasa a hoy');
});

test('snapshot de madrugada anclado: 05:20 de mañana sigue datado después de medianoche', () => {
  const obtenidoEn = new Date('2026-11-06T22:00:00-03:00');
  const ahora = new Date('2026-11-07T00:10:00-03:00');
  const api = [horario({ id: 'h2', hora: '05:20', tipoDeDia: 'sabado' })];
  const anotados = anotarProximosDeApi(api, [], obtenidoEn, ahora);
  igual(anotados[0].fechaServicio, '2026-11-07', 'fecha anclada');
  igual(anotados[0].etiquetaDia, null, 'ya es hoy');
  igual(anotados[0].minutosRestantes, 5 * 60 + 10, 'minutos al 05:20 de hoy');
});

test('sin feriados no inventa minutos para un tipo feriado', () => {
  const ahora = new Date('2026-11-06T10:00:00-03:00');
  const api = [horario({ id: 'h1', hora: '10:42', tipoDeDia: 'feriado' })];
  const anotados = anotarProximosDeApi(api, [], ahora, ahora);
  igual(anotados[0].fechaServicio, null, 'sin fecha');
  igual(anotados[0].minutosRestantes, null, 'sin minutos');
  igual(textoHorarioSegunTabla(anotados[0]), 'Según la tabla, 10:42', 'fallback');
  const resuelto = resolverProximosParada(
    opciones({ ahora, fallbackApi: api, tablasCompletas: false }),
  );
  igual(resuelto.hoyAgotado, false, 'indatable no afirma fin de servicio');
  igual(resuelto.mensajeHoyAgotado, null, 'sin mensaje conclusivo');
});

test('calendario no listo: no promete minutos ni fin de servicio', () => {
  const ahora = new Date('2026-11-06T10:40:00-03:00');
  const tablas = [horario({ id: 'h1', hora: '10:42', tipoDeDia: 'habil' })];
  const resuelto = resolverProximosParada(
    opciones({
      ahora,
      tablas,
      fallbackApi: tablas,
      calendarioListo: false,
      tablasCompletas: true,
    }),
  );
  igual(resuelto.proximos[0].minutosRestantes, null, 'sin minutos');
  igual(resuelto.proximos[0].fechaServicio, null, 'sin fecha');
  igual(resuelto.hoyAgotado, false, 'no afirma');
  igual(resuelto.mensajeHoyAgotado, null, 'sin hasta');
  igual(textoHorarioSegunTabla(resuelto.proximos[0]), 'Según la tabla, 10:42', 'texto');
});

test('calendario no listo y sin snapshot: no concluye que no hay servicio', () => {
  const ahora = new Date('2026-11-06T22:00:00-03:00');
  const resuelto = resolverProximosParada(
    opciones({
      ahora,
      calendarioListo: false,
      tablasCompletas: false,
    }),
  );
  igual(resuelto.proximos.length, 0, 'vacío');
  igual(
    resuelto.mensajeVacio,
    'No se pudo confirmar el calendario de feriados. Mostramos la hora según la tabla, sin minutos.',
    'mensaje honesto',
  );
});

test('tablas parciales no se usan como calendario exhaustivo', () => {
  const ahora = new Date('2026-11-07T22:00:00-03:00');
  const parcial = [horario({ id: 'lun', hora: '05:20', tipoDeDia: 'habil' })];
  const resuelto = resolverProximosParada(
    opciones({
      ahora,
      tablas: parcial,
      fallbackApi: [horario({ id: 'api', hora: '05:20', tipoDeDia: 'habil' })],
      tablasCompletas: false,
    }),
  );
  igual(resuelto.mensajeHoyAgotado, null, 'no promete lunes');
  igual(resuelto.proximos[0].horario.id, 'api', 'usa snapshot');
  igual(resuelto.proximos[0].minutosRestantes, null, 'habil del sábado no data el lunes');
});

test('hora inválida no se usa para minutos', () => {
  const ahora = new Date('2026-11-06T10:00:00-03:00');
  const tablas = [horario({ id: 'h1', hora: '25:99', tipoDeDia: 'habil' })];
  const proximos = proximosHorariosDesdeTabla(tablas, [], 3, ahora);
  igual(proximos.length, 0, 'se ignora');
  igual(instanteParana('2026-11-06', '25:99'), null, 'instante nulo');
});

test('mensaje PRD cuando hoy se acabó y hay servicio mañana', () => {
  const ahora = new Date('2026-11-06T22:00:00-03:00');
  const tablas = [
    horario({ id: 'h1', hora: '21:00', tipoDeDia: 'habil' }),
    horario({ id: 'h2', hora: '05:20', tipoDeDia: 'sabado' }),
  ];
  igual(
    mensajeSinProximosServicio(tablas, [], ahora),
    'No hay más servicio hasta mañana a las 05:20',
    'mensaje PRD',
  );
  const resuelto = resolverProximosParada(opciones({ ahora, tablas }));
  igual(resuelto.mensajeHoyAgotado, 'No hay más servicio hasta mañana a las 05:20', 'banner');
  igual(resuelto.proximos[0].etiquetaDia, 'mañana', 'etiqueta lista');
});

test('sin tabla ni API, vacío honesto', () => {
  const ahora = new Date('2026-11-06T22:00:00-03:00');
  const resuelto = resolverProximosParada(opciones({ ahora }));
  igual(resuelto.proximos.length, 0, 'vacío');
  igual(resuelto.mensajeVacio, 'No hay próximos servicios para esta parada.', 'mensaje');
});

test('formatea minutos y texto según la tabla', () => {
  igual(formatearMinutosRestantes(0), 'menos de 1 min', 'cero');
  igual(formatearMinutosRestantes(12), 'en 12 min', 'minutos');
  igual(formatearMinutosRestantes(120), 'en 2 h', 'horas exactas');
  igual(formatearMinutosRestantes(130), 'en 2 h 10 min', 'horas y minutos');
  igual(
    textoHorarioSegunTabla({
      horario: horario({ id: 'h1', hora: '10:42', tipoDeDia: 'habil' }),
      fechaServicio: '2026-11-06',
      minutosRestantes: 2,
      etiquetaDia: null,
    }),
    'Según la tabla, 10:42 · en 2 min',
    'texto',
  );
});

console.log('Todos los casos de borde pasaron.');

// Adaptado de Lucas-v1 (9bedb95): handler fuera de componentes, canales Android
// y DATE trigger. No se copia su permiso automático al tener favoritos, ni el
// primer horario de snapshot sin −10 min, ni ids de línea/parada crudos, ni
// cancelAll sin usar. Push /dispositivos no se implementa (API 501; el TFI pide locales).

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { borrarClave, guardarJson, leerJson } from '@/lib/almacenClaveValor';
import { destinoDesdeRuta, resolverAvisosNuevos } from '@/lib/avisosNuevos';
import {
  calcularRecordatorio,
  type PedidoRecordatorio,
  type RecordatorioCalculado,
} from '@/lib/recordatorioHorario';
import { CLAVES } from '@/servicios/claves';
import type { Aviso } from '@/tipos/aviso';

export const CANAL_AVISOS = 'avisos-lineas';
export const CANAL_RECORDATORIOS = 'recordatorios-horario';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export type RecordatorioGuardado = RecordatorioCalculado & {
  notificationId: string;
  paradaId: string;
  horarioId: string;
  fechaServicio: string;
  hora: string;
};

function leerRecordatorios(): RecordatorioGuardado[] {
  return leerJson<RecordatorioGuardado[]>(CLAVES.recordatoriosProgramados) ?? [];
}

function guardarRecordatorios(items: RecordatorioGuardado[]): void {
  guardarJson(CLAVES.recordatoriosProgramados, items);
}

export function listarRecordatoriosParada(paradaId: string): RecordatorioGuardado[] {
  return leerRecordatorios().filter((item) => item.paradaId === paradaId);
}

export function hayRecordatorio(paradaId: string, horarioId: string, fechaServicio: string | null): boolean {
  if (!fechaServicio) return false;
  return leerRecordatorios().some(
    (item) => item.paradaId === paradaId && item.horarioId === horarioId && item.fechaServicio === fechaServicio,
  );
}

export async function asegurarCanalesAndroid(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CANAL_AVISOS, {
    name: 'Avisos de líneas favoritas',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
  });
  await Notifications.setNotificationChannelAsync(CANAL_RECORDATORIOS, {
    name: 'Recordatorios de horario',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export async function permisoNotificacionesConcedido(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const actual = await Notifications.getPermissionsAsync();
  return actual.granted || actual.status === 'granted';
}

export async function pedirPermisoNotificaciones(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  await asegurarCanalesAndroid();
  const actual = await Notifications.getPermissionsAsync();
  if (actual.granted || actual.status === 'granted') return true;
  const pedido = await Notifications.requestPermissionsAsync();
  return pedido.granted || pedido.status === 'granted';
}

async function cancelarIdentifier(id: string): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // Si ya se disparó o no existe, seguimos con el resto.
  }
}

export async function programarRecordatorioPedido(
  pedido: PedidoRecordatorio,
  ahora = new Date(),
): Promise<{ ok: true; item: RecordatorioGuardado } | { ok: false; motivo: string }> {
  const calculo = calcularRecordatorio(pedido, ahora);
  if (!calculo.ok) return calculo;
  if (Platform.OS === 'web') {
    return { ok: false, motivo: 'En la web el teléfono no programa notificaciones locales.' };
  }

  const concedido = await pedirPermisoNotificaciones();
  if (!concedido) {
    return { ok: false, motivo: 'Sin permiso de notificaciones no se puede programar el recordatorio.' };
  }

  const existente = leerRecordatorios().find((item) => item.clave === calculo.recordatorio.clave);
  if (existente) await cancelarIdentifier(existente.notificationId);

  const notificationId = await Notifications.scheduleNotificationAsync({
    identifier: calculo.recordatorio.clave,
    content: {
      title: calculo.recordatorio.titulo,
      body: calculo.recordatorio.cuerpo,
      data: {
        tipo: 'recordatorio',
        ruta: calculo.recordatorio.ruta,
        paradaId: pedido.paradaId,
      },
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: calculo.recordatorio.disparo,
      channelId: CANAL_RECORDATORIOS,
    },
  });

  const item: RecordatorioGuardado = {
    ...calculo.recordatorio,
    notificationId,
    paradaId: pedido.paradaId,
    horarioId: pedido.horarioId,
    fechaServicio: pedido.fechaServicio as string,
    hora: pedido.hora,
  };
  guardarRecordatorios([
    ...leerRecordatorios().filter((actual) => actual.clave !== item.clave),
    item,
  ]);
  return { ok: true, item };
}

export async function cancelarRecordatorioPedido(
  paradaId: string,
  horarioId: string,
  fechaServicio: string | null,
): Promise<void> {
  const items = leerRecordatorios();
  const restantes: RecordatorioGuardado[] = [];
  for (const item of items) {
    const coincide =
      item.paradaId === paradaId &&
      item.horarioId === horarioId &&
      (!fechaServicio || item.fechaServicio === fechaServicio);
    if (coincide) await cancelarIdentifier(item.notificationId);
    else restantes.push(item);
  }
  guardarRecordatorios(restantes);
}

export function leerIdsAvisosVistos(): string[] | null {
  return leerJson<string[]>(CLAVES.avisosVistos);
}

export function guardarIdsAvisosVistos(ids: string[]): void {
  guardarJson(CLAVES.avisosVistos, ids);
}

export function resembrarAvisosVistos(): void {
  borrarClave(CLAVES.avisosVistos);
}

export async function notificarAvisoLocal(aviso: Aviso): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: aviso.titulo,
      body: aviso.detalle,
      data: { tipo: 'aviso', ruta: `/aviso/${aviso.id}`, avisoId: aviso.id },
      sound: true,
    },
    trigger: Platform.OS === 'android' ? { channelId: CANAL_AVISOS } : null,
  });
}

export async function procesarAvisosLlegados(opciones: {
  avisos: Aviso[];
  lineasFavoritas: string[];
  avisosActivos: boolean;
  ahora?: Date;
}): Promise<void> {
  const resultado = resolverAvisosNuevos({
    ...opciones,
    idsVistos: leerIdsAvisosVistos(),
    ahora: opciones.ahora,
  });
  guardarIdsAvisosVistos(resultado.ids);
  if (resultado.accion !== 'notificar') return;
  if (Platform.OS === 'web') return;
  const concedido = await permisoNotificacionesConcedido();
  if (!concedido) return;
  await asegurarCanalesAndroid();
  for (const aviso of resultado.avisos) {
    await notificarAvisoLocal(aviso);
  }
}

export function destinoDeRespuesta(data: Record<string, unknown> | undefined) {
  const ruta = data?.ruta;
  return typeof ruta === 'string' ? destinoDesdeRuta(ruta) : null;
}

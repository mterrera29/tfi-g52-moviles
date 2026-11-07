import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { leerJson, guardarJson } from '@/lib/almacenClaveValor';
import { CLAVES } from '@/servicios/claves';

const CANAL_AVISOS = 'avisos-lineas';
const CANAL_RECORDATORIOS = 'recordatorios-horario';

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

export async function configurarNotificaciones(): Promise<boolean> {
  if (Platform.OS === 'android') {
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

  const { status: actual } = await Notifications.getPermissionsAsync();
  if (actual === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function notificarAviso(titulo: string, detalle: string, avisoId: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: titulo,
      body: detalle,
      data: { avisoId },
      sound: true,
    },
    trigger: null,
  });
}

export async function programarRecordatorio(hora: string, lineaId: string, paradaId: string): Promise<string | null> {
  const [horas, minutos] = hora.split(':').map(Number);
  const ahora = new Date();
  const objetivo = new Date(ahora);
  objetivo.setHours(horas, minutos, 0, 0);

  if (objetivo <= ahora) {
    objetivo.setDate(objetivo.getDate() + 1);
  }

  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Recordatorio de horario',
      body: `Tu línea ${lineaId} pasa por la parada ${paradaId} a las ${hora}`,
      data: { lineaId, paradaId, hora },
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: objetivo,
    },
  });
}

export async function cancelarRecordatorios(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export function guardarIdsNotificaciones(ids: string[]): void {
  guardarJson(CLAVES.notificacionesProgramadas, ids);
}

export function leerIdsNotificaciones(): string[] {
  return leerJson<string[]>(CLAVES.notificacionesProgramadas) ?? [];
}

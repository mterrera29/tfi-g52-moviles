import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { destinoDeRespuesta } from '@/servicios/notificaciones';

export function useRespuestaNotificaciones() {
  const ultimoId = useRef<string | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    function abrir(respuesta: Notifications.NotificationResponse | null) {
      if (!respuesta) return;
      const id = respuesta.notification.request.identifier;
      if (ultimoId.current === id) return;
      const destino = destinoDeRespuesta(
        respuesta.notification.request.content.data as Record<string, unknown> | undefined,
      );
      if (!destino) return;
      ultimoId.current = id;
      router.push(destino);
    }

    const sub = Notifications.addNotificationResponseReceivedListener(abrir);
    abrir(Notifications.getLastNotificationResponse());
    return () => {
      sub.remove();
    };
  }, []);
}

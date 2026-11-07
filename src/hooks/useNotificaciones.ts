import { useEffect } from 'react';

import { useSesion } from '@/contextos/sesion';
import { useFavoritos } from '@/hooks/useFavoritos';
import { configurarNotificaciones, programarRecordatorio, guardarIdsNotificaciones } from '@/servicios/notificaciones';
import { consultarParadaDetalle } from '@/servicios/consulta';

export function useNotificaciones() {
  const { sesion, restaurando } = useSesion();
  const { paradasFavoritas } = useFavoritos();

  useEffect(() => {
    if (restaurando || !sesion || paradasFavoritas.length === 0) return;

    let cancelado = false;

    async function programar() {
      try {
        const permiso = await configurarNotificaciones();
        if (!permiso || cancelado) return;

        const nuevosIds: string[] = [];

        for (const paradaId of paradasFavoritas.slice(0, 3)) {
          if (cancelado) break;
          try {
            const detalle = await consultarParadaDetalle(paradaId, 1);
            const horario = detalle.horarios[0];
            if (!horario) continue;

            const id = await programarRecordatorio(horario.hora, horario.lineaId, paradaId);
            if (id) nuevosIds.push(id);
          } catch {
            // Si falla una parada, seguimos con las demás.
          }
        }

        if (!cancelado) {
          guardarIdsNotificaciones(nuevosIds);
        }
      } catch {
        // Ignorar errores de notificaciones
      }
    }

    void programar();

    return () => {
      cancelado = true;
    };
  }, [sesion, restaurando, paradasFavoritas]);
}

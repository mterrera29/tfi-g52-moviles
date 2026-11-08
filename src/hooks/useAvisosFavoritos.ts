import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { useSesion } from '@/contextos/sesion';
import { useFavoritos } from '@/hooks/useFavoritos';
import { consultarAvisos } from '@/servicios/consulta';
import { procesarAvisosLlegados } from '@/servicios/notificaciones';
import type { RespuestaError } from '@/tipos/api';

export function useAvisosFavoritos() {
  const queryClient = useQueryClient();
  const { sesion, restaurando } = useSesion();
  const { usuario, lineasFavoritas } = useFavoritos();
  const activo = !!sesion && !!usuario?.avisosActivos;

  const consulta = useQuery<Awaited<ReturnType<typeof consultarAvisos>>, RespuestaError>({
    queryKey: ['avisos', 'vigentes'],
    queryFn: consultarAvisos,
    enabled: !restaurando && activo,
  });

  useEffect(() => {
    const sub = AppState.addEventListener('change', (estado: AppStateStatus) => {
      if (estado === 'active' && activo) {
        void queryClient.invalidateQueries({ queryKey: ['avisos', 'vigentes'] });
      }
    });
    return () => sub.remove();
  }, [activo, queryClient]);

  useEffect(() => {
    if (restaurando || !activo) return;
    if (!consulta.data) return;
    void procesarAvisosLlegados({
      avisos: consulta.data.datos,
      lineasFavoritas,
      avisosActivos: true,
    });
  }, [restaurando, activo, consulta.data, lineasFavoritas]);
}

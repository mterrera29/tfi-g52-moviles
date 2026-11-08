import { useNetworkState } from 'expo-network';
import { useEffect } from 'react';

import { useSesion } from '@/contextos/sesion';
import { drenarReportesPendientes } from '@/servicios/reportes';

export function useDrenajeReportes() {
  const red = useNetworkState();
  const { sesion, restaurando } = useSesion();

  useEffect(() => {
    if (restaurando) return;
    if (!sesion) return;
    if (red.isInternetReachable !== true) return;
    void drenarReportesPendientes(sesion.usuario.id);
  }, [restaurando, sesion?.usuario.id, red.isInternetReachable]);
}

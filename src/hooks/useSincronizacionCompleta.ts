import { useNetworkState } from 'expo-network';
import { useEffect } from 'react';

import { sincronizarTodo } from '@/servicios/sincronizacion';

// Cada vez que hay internet (al abrir la app o cuando vuelve la señal) se baja todo
// para poder consultar cualquier línea o parada sin conexión (U5.Pers diap. 26 y 27).
export function useSincronizacionCompleta() {
  const red = useNetworkState();

  useEffect(() => {
    if (red.isInternetReachable !== true) return;
    // Si falla, la app sigue con lo que ya tenía guardado.
    void sincronizarTodo().catch((error: unknown) => {
      if (__DEV__) console.warn('No se pudo hacer la sincronización completa', error);
    });
  }, [red.isInternetReachable]);
}

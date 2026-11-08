import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

import type { Coordenadas } from '@/tipos/linea';

/**
 * Devuelve la última posición conocida SOLO si el permiso ya estaba concedido.
 * No muestra ningún pedido de permiso: si la persona no lo dio, no hay distancia y listo.
 */
export function useUbicacionConocida(): Coordenadas | null {
  const [coordenadas, setCoordenadas] = useState<Coordenadas | null>(null);

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const { granted } = await Location.getForegroundPermissionsAsync();
        if (!granted) return;
        const posicion = await Location.getLastKnownPositionAsync();
        if (activo && posicion) {
          setCoordenadas({ latitud: posicion.coords.latitude, longitud: posicion.coords.longitude });
        }
      } catch {
        // Sin ubicación simplemente no mostramos la distancia.
      }
    })();
    return () => {
      activo = false;
    };
  }, []);

  return coordenadas;
}

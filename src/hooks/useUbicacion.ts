import { useRef, useState } from 'react';
import * as Location from 'expo-location';
import type { Coordenadas } from '@/tipos/linea';

type EstadoUbicacion = 'sin-pedir' | 'pidiendo' | 'concedida' | 'negada';

export function useUbicacion() {
  const [coordenadas, setCoordenadas] = useState<Coordenadas | null>(null);
  const [estado, setEstado] = useState<EstadoUbicacion>('sin-pedir');
  // Si es true, el sistema ya no vuelve a mostrar el cartel: solo se arregla desde Ajustes.
  const [bloqueada, setBloqueada] = useState(false);
  const pidiendo = useRef(false);

  async function pedirUbicacion() {
    if (pidiendo.current) return;
    pidiendo.current = true;
    setEstado('pidiendo');
    try {
      const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setBloqueada(!canAskAgain);
        setCoordenadas(null);
        setEstado('negada');
        return;
      }
      function mostrar(posicion: Location.LocationObject) {
        setCoordenadas({ latitud: posicion.coords.latitude, longitud: posicion.coords.longitude });
        setEstado('concedida');
      }
      // Si falla la última conocida, todavía intentamos obtener la actual.
      const ultima = await Location.getLastKnownPositionAsync().catch(() => null);
      if (ultima) mostrar(ultima);
      const actual = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      mostrar(actual);
    } catch {
      setCoordenadas(null);
      setEstado('negada');
    } finally {
      pidiendo.current = false;
    }
  }

  return { coordenadas, estado, bloqueada, pedirUbicacion };
}

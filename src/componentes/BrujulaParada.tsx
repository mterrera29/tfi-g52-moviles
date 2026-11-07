import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Platform } from 'react-native';
import { Magnetometer } from 'expo-sensors';
import * as Location from 'expo-location';

import { useTema } from '@/contextos/tema';
import type { Coordenadas } from '@/tipos/linea';

function rumboEntre(origen: Coordenadas, destino: Coordenadas): number {
  const lat1 = (origen.latitud * Math.PI) / 180;
  const lat2 = (destino.latitud * Math.PI) / 180;
  const dLon = ((destino.longitud - origen.longitud) * Math.PI) / 180;

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  const rumbo = (Math.atan2(y, x) * 180) / Math.PI;
  return (rumbo + 360) % 360;
}

export function BrújulaParada({ destino }: { destino: Coordenadas }) {
  const { colores } = useTema();
  const [rotacion, setRotacion] = useState(0);
  const [disponible, setDisponible] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') {
      setError('La brújula no está disponible en web.');
      return;
    }

    let suscripcion: { remove: () => void } | null = null;

    async function iniciar() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError('Necesitamos tu ubicación para guiarte hasta la parada.');
          return;
        }

        const magnetometroDisponible = await Magnetometer.isAvailableAsync();
        if (!magnetometroDisponible) {
          setError('Este dispositivo no tiene magnetómetro.');
          return;
        }

        setDisponible(true);
        Magnetometer.setUpdateInterval(100);

        suscripcion = Magnetometer.addListener((medicion) => {
          const { x, y } = medicion;
          const rumboMagnetico = (Math.atan2(y, x) * 180) / Math.PI;
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
            .then((pos) => {
              const origen: Coordenadas = {
                latitud: pos.coords.latitude,
                longitud: pos.coords.longitude,
              };
              const rumboDestino = rumboEntre(origen, destino);
              const ajuste = rumboDestino - rumboMagnetico;
              setRotacion((ajuste + 360) % 360);
            })
            .catch(() => {});
        });
      } catch {
        setError('No se pudo iniciar la brújula.');
      }
    }

    void iniciar();

    return () => {
      suscripcion?.remove();
    };
  }, [destino.latitud, destino.longitud]);

  if (Platform.OS === 'web') {
    return null;
  }

  if (error) {
    return (
      <View style={estilos.contenedor}>
        <Text style={[estilos.texto, { color: colores.textoSecundario }]}>{error}</Text>
      </View>
    );
  }

  if (!disponible) {
    return (
      <View style={estilos.contenedor}>
        <Text style={[estilos.texto, { color: colores.textoSecundario }]}>Activando brújula...</Text>
      </View>
    );
  }

  return (
    <View style={estilos.contenedor} accessibilityLabel={`Brújula: girá ${Math.round(rotacion)} grados para apuntar a la parada`}>
      <View style={[estilos.circulo, { borderColor: colores.borde }]}>
        <Text
          style={[estilos.flecha, { color: colores.acento, transform: [{ rotate: `${rotacion}deg` }] }]}
          accessible={false}
        >
          ↑
        </Text>
      </View>
      <Text style={[estilos.texto, { color: colores.textoSecundario }]}>
        Girá hasta que la flecha apunte hacia arriba
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { alignItems: 'center', gap: 8, padding: 12 },
  circulo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flecha: { fontSize: 32, fontWeight: '700' },
  texto: { fontSize: 13, textAlign: 'center' },
});

import { useRef } from 'react';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { router } from 'expo-router';
import type { PropsMapa } from './MapaTipos';

export function Mapa({ coordenadas, paradas = [], recorridos = [], color, descripcion }: PropsMapa) {
  const mapaRef = useRef<MapView>(null);
  // una parada puede estar en la ida y en la vuelta (ej. la terminal): la mostramos una sola vez
  const paradasUnicas = paradas.filter((parada, i) => paradas.findIndex((p) => p.id === parada.id) === i);
  const puntos = recorridos.flatMap((recorrido) => recorrido.trazado);
  const latitudes = puntos.map((punto) => punto.latitud);
  const longitudes = puntos.map((punto) => punto.longitud);
  const regionInicial = puntos.length ? {
    latitude: (Math.min(...latitudes) + Math.max(...latitudes)) / 2,
    longitude: (Math.min(...longitudes) + Math.max(...longitudes)) / 2,
    latitudeDelta: Math.max((Math.max(...latitudes) - Math.min(...latitudes)) * 1.2, 0.01),
    longitudeDelta: Math.max((Math.max(...longitudes) - Math.min(...longitudes)) * 1.2, 0.01),
  } : {
    latitude: coordenadas?.latitud ?? -31.7333,
    longitude: coordenadas?.longitud ?? -60.5297,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  return (
    <MapView
      // la key cambia cuando llega la ubicación, así el mapa se recentra sin pelearse con el usuario si mueve el mapa
      key={coordenadas ? `${coordenadas.latitud},${coordenadas.longitud}` : 'inicial'}
      style={{ flex: 1 }}
      initialRegion={regionInicial}
      ref={mapaRef}
      // cuando el mapa está listo, encuadramos todo el recorrido para que se vea completo
      onMapReady={() => {
        if (puntos.length) {
          mapaRef.current?.fitToCoordinates(
            puntos.map((punto) => ({ latitude: punto.latitud, longitude: punto.longitud })),
            { edgePadding: { top: 30, right: 30, bottom: 30, left: 30 }, animated: false },
          );
        }
      }}
      accessibilityLabel={descripcion}
    >
      {paradasUnicas.map((parada) => (
        <Marker
          key={parada.id}
          coordinate={{ latitude: parada.coordenadas.latitud, longitude: parada.coordenadas.longitud }}
          title={parada.nombre}
          description={`Sentido ${parada.sentido}`}
          onCalloutPress={() => router.push({ pathname: '/parada/[id]', params: { id: parada.id } })}
        />
      ))}
      {recorridos.map((recorrido) => (
        <Polyline
          key={recorrido.sentido}
          coordinates={recorrido.trazado.map((punto) => ({ latitude: punto.latitud, longitude: punto.longitud }))}
          strokeColor={color}
          strokeWidth={4}
          lineDashPattern={recorrido.sentido === 'vuelta' ? [8, 8] : undefined}
        />
      ))}
    </MapView>
  );
}

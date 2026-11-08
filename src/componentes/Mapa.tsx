import { useMemo, useRef } from 'react';
import { View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

import { MarcadorParada } from '@/componentes/MarcadorParada';
import { usePistaMarkerMapa } from '@/hooks/usePistaMarkerMapa';
import { flechasDeTrazado } from '@/lib/flechasRecorrido';
import { puntosTrazadoValidos } from '@/lib/trazadoAlternativo';
import type { Recorrido } from '@/tipos/linea';
import type { PropsMapa } from './MapaTipos';

function colorDeSentido(
  recorrido: Recorrido,
  colorIda: string | undefined,
  colorVuelta: string | undefined,
  colorLinea: string | undefined,
): string {
  if (recorrido.sentido === 'ida') return colorIda ?? colorLinea ?? '#1D4ED8';
  return colorVuelta ?? colorLinea ?? '#A21CAF';
}

export function Mapa({
  coordenadas,
  paradas = [],
  recorridos = [],
  trazadosAlternativos = [],
  color,
  colorParada,
  colorIda,
  colorVuelta,
  colorDesvio = '#C2410C',
  descripcion,
  estiloInterfaz,
}: PropsMapa) {
  const mapaRef = useRef<MapView>(null);
  const pistaFlechas = usePistaMarkerMapa(`${colorIda ?? ''}-${colorVuelta ?? ''}-${estiloInterfaz ?? ''}`);
  const paradasUnicas = paradas.filter((parada, i) => paradas.findIndex((p) => p.id === parada.id) === i);

  const recorridosDibujables = useMemo(
    () =>
      recorridos
        .map((recorrido) => ({
          ...recorrido,
          trazado: puntosTrazadoValidos(recorrido.trazado),
        }))
        .filter((recorrido) => recorrido.trazado.length >= 2),
    [recorridos],
  );

  const flechasPorSentido = useMemo(
    () =>
      recorridosDibujables.map((recorrido) => ({
        sentido: recorrido.sentido,
        color: colorDeSentido(recorrido, colorIda, colorVuelta, color),
        flechas: flechasDeTrazado(recorrido.trazado),
      })),
    [recorridosDibujables, color, colorIda, colorVuelta],
  );

  const puntos = [
    ...recorridosDibujables.flatMap((recorrido) => recorrido.trazado),
    ...trazadosAlternativos.flatMap((trazado) => trazado.puntos),
  ];
  const latitudes = puntos.map((punto) => punto.latitud);
  const longitudes = puntos.map((punto) => punto.longitud);
  const regionInicial = puntos.length
    ? {
        latitude: (Math.min(...latitudes) + Math.max(...latitudes)) / 2,
        longitude: (Math.min(...longitudes) + Math.max(...longitudes)) / 2,
        latitudeDelta: Math.max((Math.max(...latitudes) - Math.min(...latitudes)) * 1.2, 0.01),
        longitudeDelta: Math.max((Math.max(...longitudes) - Math.min(...longitudes)) * 1.2, 0.01),
      }
    : {
        latitude: coordenadas?.latitud ?? -31.7333,
        longitude: coordenadas?.longitud ?? -60.5297,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };

  return (
    <MapView
      key={coordenadas ? `${coordenadas.latitud},${coordenadas.longitud}` : 'inicial'}
      style={{ flex: 1 }}
      initialRegion={regionInicial}
      ref={mapaRef}
      userInterfaceStyle={estiloInterfaz}
      onMapReady={() => {
        if (puntos.length) {
          mapaRef.current?.fitToCoordinates(
            puntos.map((punto) => ({ latitude: punto.latitud, longitude: punto.longitud })),
            { edgePadding: { top: 48, right: 30, bottom: 48, left: 30 }, animated: false },
          );
        }
      }}
      accessibilityLabel={descripcion}
    >
      {paradasUnicas.map((parada) => (
        <MarcadorParada key={parada.id} parada={parada} colorLinea={colorParada} />
      ))}
      {recorridosDibujables.map((recorrido) => (
        <Polyline
          key={recorrido.sentido}
          coordinates={recorrido.trazado.map((punto) => ({
            latitude: punto.latitud,
            longitude: punto.longitud,
          }))}
          strokeColor={colorDeSentido(recorrido, colorIda, colorVuelta, color)}
          strokeWidth={recorrido.sentido === 'ida' ? 7 : 6}
          lineDashPattern={recorrido.sentido === 'vuelta' ? [10, 10] : undefined}
          zIndex={recorrido.sentido === 'ida' ? 1 : 2}
        />
      ))}
      {trazadosAlternativos.map((trazado) => (
        <Polyline
          key={`desvio-${trazado.id}`}
          coordinates={trazado.puntos.map((punto) => ({ latitude: punto.latitud, longitude: punto.longitud }))}
          strokeColor={colorDesvio}
          strokeWidth={5}
          lineDashPattern={[4, 6]}
          zIndex={3}
        />
      ))}
      {flechasPorSentido.flatMap(({ sentido, color: colorFlecha, flechas }) =>
        flechas.map((flecha, indice) => (
          <Marker
            key={`flecha-${sentido}-${indice}`}
            coordinate={{ latitude: flecha.latitud, longitude: flecha.longitud }}
            anchor={{ x: 0.5, y: 0.55 }}
            rotation={flecha.rumbo}
            flat
            tappable={false}
            tracksViewChanges={pistaFlechas}
            zIndex={4}
            accessibilityElementsHidden
          >
            <View
              style={{
                width: 0,
                height: 0,
                borderLeftWidth: 7,
                borderRightWidth: 7,
                borderBottomWidth: 16,
                borderLeftColor: 'transparent',
                borderRightColor: 'transparent',
                borderBottomColor: colorFlecha,
              }}
            />
          </Marker>
        )),
      )}
    </MapView>
  );
}

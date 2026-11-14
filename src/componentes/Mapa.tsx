import { useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

import { MarcadorParada } from '@/componentes/MarcadorParada';
import { usePistaMarkerMapa } from '@/hooks/usePistaMarkerMapa';
import { useSinConexion } from '@/hooks/useSinConexion';
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
  // sin internet Google no puede bajar el fondo del mapa: lo avisamos (U5.Pers diap. 26)
  const sinConexion = useSinConexion();
  // al cambiar la key se vuelve a montar el MapView y Google pide de nuevo el fondo
  const [intento, setIntento] = useState(0);
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
    <View style={{ flex: 1 }}>
      <MapView
        key={`${coordenadas ? `${coordenadas.latitud},${coordenadas.longitud}` : 'inicial'}-${intento}`}
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
      {sinConexion ? (
        // fuera del mapa, abajo: si Google tiene el fondo en caché no tapa nada
        <View
          accessibilityRole='alert'
          style={{
            paddingVertical: 8,
            paddingHorizontal: 12,
            backgroundColor: '#0B3A5D',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Text style={{ flex: 1, color: '#FFFFFF', fontSize: 13, fontWeight: '600' }}>
            Sin conexión: el mapa puede verse incompleto.
          </Text>
          <Pressable
            accessibilityRole='button'
            accessibilityLabel='Reintentar cargar el mapa'
            onPress={() => setIntento((n) => n + 1)}
            style={({ pressed }) => ({
              paddingVertical: 6,
              paddingHorizontal: 10,
              borderRadius: 8,
              backgroundColor: '#FFFFFF',
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text style={{ color: '#0B3A5D', fontSize: 13, fontWeight: '700' }}>Reintentar</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

import { Callout, Marker } from 'react-native-maps';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { CartelParada } from '@/componentes/CartelParada';
import { useTema } from '@/contextos/tema';
import { usePistaMarkerMapa } from '@/hooks/usePistaMarkerMapa';
import { aspectoCartelParada } from '@/lib/colorCartelParada';
import type { Parada } from '@/tipos/parada';

export function MarcadorParada({
  parada,
  colorLinea,
}: {
  parada: Parada;
  colorLinea?: string | null;
}) {
  const { modo } = useTema();
  const aspecto = aspectoCartelParada(colorLinea, modo);
  const tracksViewChanges = usePistaMarkerMapa(`${modo}-${aspecto.fondo}`);

  return (
    <Marker
      coordinate={{
        latitude: parada.coordenadas.latitud,
        longitude: parada.coordenadas.longitud,
      }}
      accessibilityLabel={`Parada ${parada.nombre}. Sentido ${parada.sentido}`}
      anchor={{ x: 0.5, y: 1 }}
      tracksViewChanges={tracksViewChanges}
      zIndex={10}
      onCalloutPress={() => router.push({ pathname: '/parada/[id]', params: { id: parada.id } })}
    >
      <View accessible={false}>
        <CartelParada
          tamano={40}
          color={colorLinea ? aspecto.fondo : undefined}
          colorIcono={colorLinea ? aspecto.icono : undefined}
          colorBorde={colorLinea ? aspecto.borde : undefined}
        />
      </View>
      <Callout tooltip={false}>
        <View style={estilos.globo}>
          <Text style={estilos.titulo} numberOfLines={2}>{parada.nombre}</Text>
          <Text style={estilos.sentido}>Sentido {parada.sentido}</Text>
          <Text style={estilos.accion}>Ver parada ›</Text>
        </View>
      </Callout>
    </Marker>
  );
}

const estilos = StyleSheet.create({
  globo: { minWidth: 160, maxWidth: 240, paddingVertical: 4, gap: 2 },
  titulo: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  sentido: { fontSize: 13, color: '#555' },
  accion: { marginTop: 4, fontSize: 14, fontWeight: '700', color: '#0D5CAB' },
});

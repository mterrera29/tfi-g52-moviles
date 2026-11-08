import { Marker } from 'react-native-maps';
import { View } from 'react-native';
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
      title={parada.nombre}
      description={`Sentido ${parada.sentido}`}
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
    </Marker>
  );
}

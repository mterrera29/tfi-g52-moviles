import { Stack, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EstadoError } from '@/componentes/EstadoError';
import { MapaRecorridoLinea } from '@/componentes/MapaRecorridoLinea';
import { useTema } from '@/contextos/tema';
import { filtrarTrazadosAlternativos } from '@/lib/trazadoAlternativo';
import { consultarLineaDetalle } from '@/servicios/consulta';
import type { RespuestaError } from '@/tipos/api';

export default function MapaLineaPantallaCompleta() {
  const { colores } = useTema();
  const { id } = useLocalSearchParams<{ id: string }>();
  const lineaId = Array.isArray(id) ? id[0] : id;

  const { data, isPending, error, refetch } = useQuery({
    queryKey: ['linea', lineaId],
    queryFn: async () => {
      if (!lineaId) throw { error: { codigo: 'VALIDACION_FALLIDA', mensaje: 'No se indicó qué línea abrir.' } };
      return consultarLineaDetalle(lineaId);
    },
  });

  const linea = data?.linea;
  const recorridos = data?.recorridos ?? [];
  const trazadosAlternativos = filtrarTrazadosAlternativos(data?.avisos ?? []);

  if (isPending) {
    return (
      <SafeAreaView style={[estilos.centrado, { backgroundColor: colores.fondo }]} edges={['bottom']}>
        <Stack.Screen options={{ title: 'Mapa del recorrido' }} />
        <ActivityIndicator size='large' color={colores.acento} accessibilityLabel='Cargando mapa' />
        <Text style={{ color: colores.textoSecundario }}>Cargando mapa...</Text>
      </SafeAreaView>
    );
  }

  if (error || !linea) {
    return (
      <SafeAreaView style={[estilos.centrado, { backgroundColor: colores.fondo }]} edges={['bottom']}>
        <Stack.Screen options={{ title: 'Mapa del recorrido' }} />
        <EstadoError
          mensaje={error ? (error as unknown as RespuestaError).error.mensaje : 'No se pudo cargar el mapa.'}
          onReintentar={() => {
            void refetch();
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[estilos.contenedor, { backgroundColor: colores.fondo }]} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: `Mapa · Línea ${linea.numero}`,
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
      <MapaRecorridoLinea
        numeroLinea={linea.numero}
        colorLinea={linea.color}
        recorridos={linea.recorridos}
        paradas={recorridos.flatMap((recorrido) => recorrido.paradas)}
        trazadosAlternativos={trazadosAlternativos}
      />
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
  },
  centrado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
});

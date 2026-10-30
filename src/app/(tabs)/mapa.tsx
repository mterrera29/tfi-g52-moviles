import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EstadoError } from '@/componentes/EstadoError';
import { Mapa } from '@/componentes/Mapa';
import { useTema } from '@/contextos/tema';
import { useUbicacion } from '@/hooks/useUbicacion';
import { obtenerParadasCercanas } from '@/servicios/paradas';
import type { RespuestaError } from '@/tipos/api';

export default function MapaScreen() {
  const { colores } = useTema();
  const { coordenadas, estado, pedirUbicacion } = useUbicacion();
  const latitud = coordenadas ? Number(coordenadas.latitud.toFixed(3)) : null;
  const longitud = coordenadas ? Number(coordenadas.longitud.toFixed(3)) : null;
  const { data, isPending, error, refetch } = useQuery<Awaited<ReturnType<typeof obtenerParadasCercanas>>, RespuestaError>({
    queryKey: ['paradas', 'cercanas', latitud, longitud],
    enabled: estado === 'concedida' && latitud !== null && longitud !== null,
    queryFn: () => obtenerParadasCercanas({ latitud: latitud!, longitud: longitud!, radioMetros: 800 }),
  });
  const paradas = estado === 'concedida' ? data?.datos ?? [] : [];

  return (
    <SafeAreaView style={[estilos.contenedor, { backgroundColor: colores.fondo }]} edges={['bottom']}>
      <View style={estilos.mapa}>
        <Mapa coordenadas={coordenadas} paradas={paradas} descripcion='Mapa de paradas cercanas. Tocá una parada y luego su nombre para abrir su detalle.' />
      </View>
      <ScrollView style={estilos.panel} contentContainerStyle={estilos.contenido}>
        <Text style={{ color: colores.texto }}>
          Usamos tu ubicación solo mientras usás la app para mostrar las paradas cercanas a vos.
          También podés buscar la parada por nombre sin compartir tu ubicación.
        </Text>
        {estado === 'negada' && (
          <Text accessibilityRole='alert' style={{ color: colores.error }}>
            No pudimos obtener tu ubicación. Revisá el permiso de ubicación en los ajustes del teléfono y que el GPS esté encendido, o buscá por nombre.
          </Text>
        )}
        <Pressable
          accessibilityRole='button'
          accessibilityLabel={estado === 'negada' ? 'Permitir ubicación' : 'Ver paradas cerca de mí'}
          accessibilityState={{ disabled: estado === 'pidiendo' }}
          disabled={estado === 'pidiendo'}
          onPress={() => { void pedirUbicacion(); }}
          style={({ pressed }) => [estilos.boton, { backgroundColor: colores.acento, opacity: pressed || estado === 'pidiendo' ? 0.7 : 1 }]}
        >
          <Text style={[estilos.textoBoton, { color: colores.acentoTexto }]}>
            {estado === 'pidiendo' ? 'Obteniendo ubicación...' : estado === 'negada' ? 'Permitir ubicación' : 'Ver paradas cerca de mí'}
          </Text>
        </Pressable>
        <Pressable accessibilityRole='button' accessibilityLabel='Buscar la parada por nombre' onPress={() => router.replace('/paradas')} style={estilos.boton}>
          <Text style={[estilos.textoBoton, { color: colores.acento }]}>Buscar la parada por nombre</Text>
        </Pressable>
        {estado === 'concedida' && (
          isPending ? <ActivityIndicator color={colores.acento} accessibilityLabel='Cargando paradas cercanas' /> :
          error ? <EstadoError mensaje={error.error.mensaje} onReintentar={() => { void refetch(); }} /> :
          <Text accessibilityLiveRegion='polite' style={{ color: colores.textoSecundario }}>
            {paradas.length === 0 ? 'No hay paradas a menos de 800 metros de tu ubicación.' : `${paradas.length} paradas cercanas. Tocá una parada en el mapa para ver su detalle.`}
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1 },
  mapa: { flex: 1, minHeight: 180 },
  panel: { flexGrow: 0, maxHeight: '55%' },
  contenido: { padding: 16, gap: 12 },
  boton: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8 },
  textoBoton: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
});

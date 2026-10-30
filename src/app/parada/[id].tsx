import Ionicons from '@react-native-vector-icons/ionicons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSesion } from '@/contextos/sesion';
import { useFavoritos } from '@/hooks/useFavoritos';
import { useTema } from '@/contextos/tema';
import { obtenerProximosHorariosPorParada } from '@/servicios/horarios';
import { obtenerLineas } from '@/servicios/lineas';
import { obtenerParadaPorId } from '@/servicios/paradas';
import { EstadoError } from '@/componentes/EstadoError';
import type { RespuestaError } from '@/tipos/api';

export default function ParadaDetalleScreen() {
  const { colores } = useTema();
  const { sesion } = useSesion();
  const { usuario, actualizando, paradasFavoritas, alternarParadaFavorita, errorParada } = useFavoritos();
  const { id } = useLocalSearchParams<{ id: string }>();
  const paradaId = Array.isArray(id) ? id[0] : id;

  const { data, isPending, error, refetch } = useQuery({
    queryKey: ['parada', paradaId, 'proximos', 3],
    queryFn: async () => {
      if (!paradaId) throw { error: { codigo: 'VALIDACION_FALLIDA', mensaje: 'No se indicó qué parada abrir.' } };
      const [respuestaParada, respuestaLineas, respuestaHorarios] = await Promise.all([
        obtenerParadaPorId(paradaId),
        obtenerLineas(),
        obtenerProximosHorariosPorParada(paradaId, 3),
      ]);
      return {
        parada: respuestaParada.datos,
        lineas: respuestaLineas.datos.filter((linea) => respuestaParada.datos.lineaIds.includes(linea.id)),
        horarios: respuestaHorarios.datos,
      };
    },
  });
  const esFavorita = !!sesion && paradasFavoritas.includes(paradaId);
  const parada = data?.parada;
  const lineas = data?.lineas ?? [];
  const horarios = data?.horarios ?? [];

  if (isPending) {
    return (
      <SafeAreaView
        style={[estilos.centrado, { backgroundColor: colores.fondo }]}
        edges={['bottom']}
      >
        <ActivityIndicator size='large' color={colores.acento} />
        <Text style={[estilos.mensaje, { color: colores.textoSecundario }]}>
          Cargando parada...
        </Text>
      </SafeAreaView>
    );
  }

  if (error || !parada) {
    return (
      <SafeAreaView
        style={[estilos.centrado, { backgroundColor: colores.fondo }]}
        edges={['bottom']}
      >
        <EstadoError mensaje={error ? (error as unknown as RespuestaError).error.mensaje : 'No se pudo cargar la parada.'} onReintentar={() => { void refetch(); }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[estilos.contenedor, { backgroundColor: colores.fondo }]}
      edges={['bottom']}
    >
      <Stack.Screen options={{ title: parada.nombre }} />

      <ScrollView contentContainerStyle={estilos.scroll}>
        <Pressable
          accessibilityRole='button'
          accessibilityLabel={esFavorita ? 'Quitar de favoritos' : 'Agregar a favoritos'}
          accessibilityState={{ selected: esFavorita, disabled: !!sesion && (!usuario || actualizando) }}
          disabled={!!sesion && (!usuario || actualizando)}
          onPress={() => {
            if (!sesion) {
              router.push('/login');
              return;
            }
            alternarParadaFavorita(parada.id);
          }}
          style={{ alignSelf: 'flex-end', padding: 8 }}
        >
          <Ionicons name={esFavorita ? 'heart' : 'heart-outline'} size={28} color={colores.acento} />
        </Pressable>
        {errorParada && (
          <Text accessibilityLiveRegion='polite' style={{ color: colores.error }}>
            {errorParada.error.mensaje}
          </Text>
        )}

        <Text
          style={[estilos.subtitulo, { color: colores.textoSecundario }]}
          accessibilityLabel={`${parada.refugio ? 'Con refugio' : 'Sin refugio'}. Sentido ${parada.sentido}`}
        >
          {parada.refugio ? 'Con refugio' : 'Sin refugio'} · Sentido{' '}
          {parada.sentido}
        </Text>

        <Pressable
          accessibilityRole='button'
          accessibilityLabel='Cómo llegar a esta parada'
          onPress={async () => {
            try {
              await Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${parada.coordenadas.latitud},${parada.coordenadas.longitud}`);
            } catch {
              Alert.alert('No se pudo abrir el mapa', 'Intentá nuevamente para ver cómo llegar a la parada.');
            }
          }}
          style={({ pressed }) => [{ minHeight: 48, justifyContent: 'center', alignItems: 'center', borderRadius: 8, padding: 12, backgroundColor: colores.acento, opacity: pressed ? 0.7 : 1 }]}
        >
          <Text style={{ color: colores.acentoTexto, fontWeight: '600', fontSize: 16 }}>Cómo llegar</Text>
        </Pressable>

        <Text style={[estilos.seccion, { color: colores.acento }]}>
          Líneas que paran acá
        </Text>
        <View style={estilos.lineasFila}>
          {lineas.length === 0 && <Text style={{ color: colores.textoSecundario }}>No hay líneas para esta parada.</Text>}
          {lineas.map((linea) => (
            <View
              key={linea.id}
              accessible
              accessibilityLabel={`Línea ${linea.numero}`}
              style={[estilos.badge, { backgroundColor: linea.color }]}
            >
              <Text style={estilos.badgeNumero}>{linea.numero}</Text>
            </View>
          ))}
        </View>

        <Text style={[estilos.seccion, { color: colores.acento }]}>
          Próximos horarios (según la tabla)
        </Text>

        {horarios.length === 0 ? (
          <Text
            style={[estilos.mensaje, { color: colores.textoSecundario }]}
            accessibilityLiveRegion='polite'
          >
            No hay próximos servicios para esta parada.
          </Text>
        ) : (
          horarios.map((horario, indice) => {
            const linea = lineas.find((item) => item.id === horario.lineaId);
            // Sin fecha de servicio no podemos distinguir hoy de mañana ni prometer minutos.

            return (
              <View
                key={`${horario.id}-${indice}`}
                accessible
                accessibilityLabel={`Línea ${linea?.numero ?? 'desconocida'}, según la tabla ${horario.hora}`}
                style={[
                  estilos.filaHorario,
                  { borderBottomColor: colores.borde },
                ]}
              >
                <View
                  style={[
                    estilos.badgeChico,
                    { backgroundColor: linea?.color ?? colores.acento },
                  ]}
                >
                  <Text style={estilos.badgeNumero}>{linea?.numero ?? '?'}</Text>
                </View>
                <Text style={[estilos.hora, { color: colores.texto }]}>
                  Según la tabla, {horario.hora}
                </Text>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
  },
  scroll: {
    padding: 16,
    gap: 12,
  },
  centrado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  subtitulo: {
    fontSize: 15,
  },
  seccion: {
    fontSize: 17,
    fontWeight: '700',
    marginTop: 8,
  },
  lineasFila: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeChico: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeNumero: {
    color: '#fff',
    fontWeight: '700',
  },
  filaHorario: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  hora: {
    fontSize: 16,
  },
  mensaje: {
    fontSize: 15,
  },
});

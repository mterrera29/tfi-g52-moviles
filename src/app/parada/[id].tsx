import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { obtenerProximosHorariosPorParada } from '@/servicios/horarios';
import { obtenerLineas } from '@/servicios/lineas';
import { obtenerParadaPorId } from '@/servicios/paradas';
import type { Horario } from '@/tipos/horario';
import type { Linea } from '@/tipos/linea';
import type { Parada } from '@/tipos/parada';

export default function ParadaDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const paradaId = Array.isArray(id) ? id[0] : id;

  const [parada, setParada] = useState<Parada | null>(null);
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargarDetalle = useCallback(async () => {
    if (!paradaId) {
      setError('No se indicó qué parada abrir.');
      setCargando(false);
      return;
    }

    setCargando(true);
    setError(null);

    const [respuestaParada, respuestaLineas, respuestaHorarios] =
      await Promise.all([
        obtenerParadaPorId(paradaId),
        obtenerLineas(),
        obtenerProximosHorariosPorParada(paradaId),
      ]);

    if ('error' in respuestaParada) {
      setError(respuestaParada.error.mensaje);
      setCargando(false);
      return;
    }

    if ('error' in respuestaLineas) {
      setError(respuestaLineas.error.mensaje);
      setCargando(false);
      return;
    }

    if ('error' in respuestaHorarios) {
      setError(respuestaHorarios.error.mensaje);
      setCargando(false);
      return;
    }

    setParada(respuestaParada.datos);
    setLineas(
      respuestaLineas.datos.filter((linea) =>
        respuestaParada.datos.lineaIds.includes(linea.id),
      ),
    );
    setHorarios(respuestaHorarios.datos);
    setCargando(false);
  }, [paradaId]);

  useEffect(() => {
    cargarDetalle();
  }, [cargarDetalle]);

  if (cargando) {
    return (
      <SafeAreaView style={styles.centrado} edges={['bottom']}>
        <ActivityIndicator size='large' color='#0B3A5D' />
        <Text style={styles.mensaje}>Cargando parada...</Text>
      </SafeAreaView>
    );
  }

  if (error || !parada) {
    return (
      <SafeAreaView style={styles.centrado} edges={['bottom']}>
        <Text style={styles.error}>
          {error ?? 'No se pudo cargar la parada.'}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.contenedor} edges={['bottom']}>
      <Stack.Screen options={{ title: parada.nombre }} />

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.subtitulo}>
          {parada.refugio ? 'Con refugio' : 'Sin refugio'} · Sentido{' '}
          {parada.sentido}
        </Text>

        <Text style={styles.seccion}>Líneas que paran acá</Text>
        <View style={styles.lineasFila}>
          {lineas.map((linea) => (
            <View
              key={linea.id}
              style={[styles.badge, { backgroundColor: linea.color }]}
            >
              <Text style={styles.badgeNumero}>{linea.numero}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.seccion}>Próximos horarios (según la tabla)</Text>

        {horarios.length === 0 ? (
          <Text style={styles.mensaje}>
            No hay más servicio hoy en esta parada.
          </Text>
        ) : (
          horarios.map((horario) => {
            const linea = lineas.find((item) => item.id === horario.lineaId);

            return (
              <View key={horario.id} style={styles.filaHorario}>
                <View
                  style={[
                    styles.badgeChico,
                    { backgroundColor: linea?.color ?? '#0B3A5D' },
                  ]}
                >
                  <Text style={styles.badgeNumero}>{linea?.numero ?? '?'}</Text>
                </View>
                <Text style={styles.hora}>Según la tabla, {horario.hora}</Text>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: '#fff',
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
    color: '#5C6670',
  },
  seccion: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0B3A5D',
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
    borderBottomColor: '#D0D7DE',
  },
  hora: {
    fontSize: 16,
    color: '#1A1A1A',
  },
  mensaje: {
    fontSize: 15,
    color: '#5C6670',
  },
  error: {
    fontSize: 16,
    color: '#B42318',
    textAlign: 'center',
  },
});

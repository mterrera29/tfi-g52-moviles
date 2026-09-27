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

import { useTema } from '@/contextos/tema';
import { obtenerProximosHorariosPorParada } from '@/servicios/horarios';
import { obtenerLineas } from '@/servicios/lineas';
import { obtenerParadaPorId } from '@/servicios/paradas';
import type { Horario } from '@/tipos/horario';
import type { Linea } from '@/tipos/linea';
import type { Parada } from '@/tipos/parada';

export default function ParadaDetalleScreen() {
  const { colores } = useTema();
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
        <Text style={[estilos.error, { color: colores.error }]}>
          {error ?? 'No se pudo cargar la parada.'}
        </Text>
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
        <Text
          style={[estilos.subtitulo, { color: colores.textoSecundario }]}
          accessibilityLabel={`${parada.refugio ? 'Con refugio' : 'Sin refugio'}. Sentido ${parada.sentido}`}
        >
          {parada.refugio ? 'Con refugio' : 'Sin refugio'} · Sentido{' '}
          {parada.sentido}
        </Text>

        <Text style={[estilos.seccion, { color: colores.acento }]}>
          Líneas que paran acá
        </Text>
        <View style={estilos.lineasFila}>
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
            No hay más servicio hoy en esta parada.
          </Text>
        ) : (
          horarios.map((horario) => {
            const linea = lineas.find((item) => item.id === horario.lineaId);

            return (
              <View
                key={horario.id}
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
  error: {
    fontSize: 16,
    textAlign: 'center',
  },
});

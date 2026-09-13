import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { obtenerLineas } from '@/servicios/lineas';
import type { Linea, RespuestaError, RespuestaExito } from '@/tipos/linea';

export default function LineasScreen() {
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargarLineas = useCallback(async () => {
    setCargando(true);
    setError(null);

    const respuesta = await obtenerLineas();

    if ('error' in respuesta) {
      setError(respuesta.error.mensaje);
      setLineas([]);
    } else {
      setLineas(respuesta.datos);
    }

    setCargando(false);
  }, []);

  useEffect(() => {
    cargarLineas();
  }, [cargarLineas]);

  if (cargando) {
    return (
      <SafeAreaView style={styles.centrado} edges={['bottom']}>
        <ActivityIndicator size='large' color='#0B3A5D' />
        <Text>Cargando líneas...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.centrado} edges={['bottom']}>
        <Text style={styles.error}>{error}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.contenedor} edges={['bottom']}>
      <FlatList
        data={lineas}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/linea/[id]',
                params: { id: item.id },
              })
            }
            style={styles.fila}
          >
            <View style={[styles.badge, { backgroundColor: item.color }]}>
              <Text style={styles.numero}>{item.numero}</Text>
            </View>
            <View>
              <Text style={styles.nombre}>{item.nombre}</Text>
              <Text style={styles.empresa}>{item.empresa}</Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={<Text>No hay líneas.</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#fff' },
  centrado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#D0D7DE',
  },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numero: { color: '#fff', fontWeight: '700' },
  nombre: { fontSize: 16, fontWeight: '600' },
  empresa: { color: '#5C6670' },
  error: { color: '#B42318' },
});

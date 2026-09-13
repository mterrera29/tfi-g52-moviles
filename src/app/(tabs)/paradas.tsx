import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { obtenerParadas } from '@/servicios/paradas';
import type { Parada } from '@/tipos/parada';

export default function ParadasScreen() {
  const [paradas, setParadas] = useState<Parada[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargarParadas = useCallback(async () => {
    setCargando(true);
    setError(null);

    const respuesta = await obtenerParadas();

    if ('error' in respuesta) {
      setError(respuesta.error.mensaje);
      setParadas([]);
    } else {
      setParadas(respuesta.datos);
    }

    setCargando(false);
  }, []);

  useEffect(() => {
    cargarParadas();
  }, [cargarParadas]);

  const paradasFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    if (!texto) {
      return paradas;
    }

    return paradas.filter((parada) =>
      parada.nombre.toLowerCase().includes(texto),
    );
  }, [busqueda, paradas]);

  if (cargando) {
    return (
      <SafeAreaView style={styles.centrado} edges={['bottom']}>
        <ActivityIndicator size='large' color='#0B3A5D' />
        <Text style={styles.mensaje}>Cargando paradas...</Text>
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
      <TextInput
        value={busqueda}
        onChangeText={setBusqueda}
        placeholder='Buscar parada por nombre o calle'
        style={styles.buscador}
        autoCapitalize='none'
      />

      <FlatList
        data={paradasFiltradas}
        keyExtractor={(item) => item.id}
        refreshing={cargando}
        onRefresh={cargarParadas}
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/parada/[id]',
                params: { id: item.id },
              })
            }
            style={({ pressed }) => [
              styles.fila,
              pressed && styles.filaPresionada,
            ]}
          >
            <Text style={styles.nombre}>{item.nombre}</Text>
            <Text style={styles.detalle}>
              {item.refugio ? 'Con refugio' : 'Sin refugio'} · Sentido{' '}
              {item.sentido}
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.centrado}>
            <Text style={styles.mensaje}>No se encontraron paradas.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centrado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  buscador: {
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#D0D7DE',
    borderRadius: 10,
    fontSize: 16,
  },
  fila: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#D0D7DE',
  },
  filaPresionada: {
    backgroundColor: '#F4F7FA',
  },
  nombre: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  detalle: {
    marginTop: 4,
    fontSize: 14,
    color: '#5C6670',
  },
  mensaje: {
    fontSize: 16,
    color: '#5C6670',
  },
  error: {
    fontSize: 16,
    color: '#B42318',
    textAlign: 'center',
  },
});

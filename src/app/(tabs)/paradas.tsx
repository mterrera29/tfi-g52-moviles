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

import { useTema } from '@/contextos/tema';
import { useColumnasLista } from '@/hooks/useColumnasLista';
import { obtenerParadas } from '@/servicios/paradas';
import type { Parada } from '@/tipos/parada';

export default function ParadasScreen() {
  const { colores } = useTema();
  const { columnas } = useColumnasLista();
  const [paradas, setParadas] = useState<Parada[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const esGrilla = columnas > 1;

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
      <SafeAreaView
        style={[estilos.centrado, { backgroundColor: colores.fondo }]}
        edges={['bottom']}
      >
        <ActivityIndicator size='large' color={colores.acento} />
        <Text style={[estilos.mensaje, { color: colores.textoSecundario }]}>
          Cargando paradas...
        </Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView
        style={[estilos.centrado, { backgroundColor: colores.fondo }]}
        edges={['bottom']}
      >
        <Text style={[estilos.error, { color: colores.error }]}>{error}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[estilos.contenedor, { backgroundColor: colores.fondo }]}
      edges={['bottom']}
    >
      <TextInput
        value={busqueda}
        onChangeText={setBusqueda}
        placeholder='Buscar parada por nombre o calle'
        placeholderTextColor={colores.textoSecundario}
        style={[
          estilos.buscador,
          {
            borderColor: colores.borde,
            backgroundColor: colores.fondoSecundario,
            color: colores.texto,
          },
        ]}
        autoCapitalize='none'
      />

      <FlatList
        key={columnas}
        data={paradasFiltradas}
        numColumns={columnas}
        keyExtractor={(item) => item.id}
        refreshing={cargando}
        onRefresh={cargarParadas}
        columnWrapperStyle={esGrilla ? estilos.filaGrilla : undefined}
        contentContainerStyle={esGrilla ? estilos.contenidoGrilla : undefined}
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/parada/[id]',
                params: { id: item.id },
              })
            }
            style={({ pressed }) => [
              estilos.fila,
              esGrilla && estilos.celdaGrilla,
              esGrilla
                ? {
                    borderColor: colores.borde,
                    backgroundColor: colores.fondoSecundario,
                  }
                : { borderBottomColor: colores.borde },
              pressed && { backgroundColor: colores.fondoSecundario },
            ]}
          >
            <Text style={[estilos.nombre, { color: colores.texto }]}>
              {item.nombre}
            </Text>
            <Text style={[estilos.detalle, { color: colores.textoSecundario }]}>
              {item.refugio ? 'Con refugio' : 'Sin refugio'} · Sentido{' '}
              {item.sentido}
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={estilos.listaVacia}>
            <Text style={[estilos.mensaje, { color: colores.textoSecundario }]}>
              No se encontraron paradas.
            </Text>
          </View>
        }
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
  listaVacia: {
    padding: 24,
    alignItems: 'center',
  },
  buscador: {
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 10,
    fontSize: 16,
  },
  contenidoGrilla: {
    paddingHorizontal: 8,
  },
  filaGrilla: {
    gap: 8,
  },
  fila: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  celdaGrilla: {
    flex: 1,
    borderBottomWidth: 0,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    marginBottom: 8,
  },
  nombre: {
    fontSize: 16,
    fontWeight: '600',
  },
  detalle: {
    marginTop: 4,
    fontSize: 14,
  },
  mensaje: {
    fontSize: 16,
  },
  error: {
    fontSize: 16,
    textAlign: 'center',
  },
});

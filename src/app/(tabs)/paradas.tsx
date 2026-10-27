import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
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
import type { RespuestaError } from '@/tipos/api';
import { EstadoError } from '@/componentes/EstadoError';

export default function ParadasScreen() {
  const { colores } = useTema();
  const { columnas, onLayout } = useColumnasLista();
  const [busqueda, setBusqueda] = useState('');
  const { data, isPending, error, refetch, isRefetching } = useQuery<Awaited<ReturnType<typeof obtenerParadas>>, RespuestaError>({
    queryKey: ['paradas'],
    queryFn: () => obtenerParadas(),
  });
  const paradas = data?.datos ?? [];
  const esGrilla = columnas > 1;

  const paradasFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    if (!texto) {
      return paradas;
    }

    return paradas.filter((parada) =>
      parada.nombre.toLowerCase().includes(texto),
    );
  }, [busqueda, paradas]);

  if (isPending) {
    return (
      <SafeAreaView
        style={[estilos.centrado, { backgroundColor: colores.fondo }]}
        edges={['bottom']}
      >
        <ActivityIndicator
          size='large'
          color={colores.acento}
          accessibilityLabel='Cargando paradas'
        />
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
        <EstadoError
          mensaje={error.error.mensaje}
          onReintentar={() => { void refetch(); }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      onLayout={onLayout}
      style={[estilos.contenedor, { backgroundColor: colores.fondo }]}
      edges={['bottom']}
    >
      <KeyboardAvoidingView
        style={estilos.contenedor}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      <TextInput
        value={busqueda}
        onChangeText={setBusqueda}
        placeholder='Buscar parada por nombre o calle'
        placeholderTextColor={colores.textoSecundario}
        accessibilityLabel='Buscar parada por nombre o calle'
        accessibilityRole='search'
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

      <Text
        accessibilityLiveRegion='polite'
        style={estilos.contador}
      >
        {paradasFiltradas.length === 1
          ? '1 parada encontrada'
          : `${paradasFiltradas.length} paradas encontradas`}
      </Text>

      <FlatList
        key={esGrilla ? `grilla-${columnas}` : 'lista'}
        data={paradasFiltradas}
        {...(esGrilla
          ? { numColumns: columnas, columnWrapperStyle: estilos.filaGrilla }
          : {})}
        keyExtractor={(item) => item.id}
        refreshing={isRefetching}
        onRefresh={() => { void refetch(); }}
        contentContainerStyle={esGrilla ? estilos.contenidoGrilla : undefined}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole='button'
            accessibilityLabel={`${item.nombre}. ${item.refugio ? 'Con refugio' : 'Sin refugio'}. Sentido ${item.sentido}`}
            accessibilityHint='Abre el detalle de la parada'
            hitSlop={8}
            onPress={() =>
              router.push({
                pathname: '/parada/[id]',
                params: { id: item.id },
              })
            }
            style={({ pressed }) => [
              estilos.fila,
              esGrilla && estilos.celdaGrilla,
              { borderBottomColor: colores.borde },
              esGrilla && {
                borderColor: colores.borde,
                backgroundColor: colores.fondoSecundario,
              },
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
      </KeyboardAvoidingView>
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
  contador: {
    position: 'absolute',
    width: 1,
    height: 1,
    overflow: 'hidden',
    opacity: 0,
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
});

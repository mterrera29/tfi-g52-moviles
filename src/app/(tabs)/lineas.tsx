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

import { useTema } from '@/contextos/tema';
import { useColumnasLista } from '@/hooks/useColumnasLista';
import { obtenerLineas } from '@/servicios/lineas';
import type { Linea } from '@/tipos/linea';

export default function LineasScreen() {
  const { colores } = useTema();
  const { columnas } = useColumnasLista();
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const esGrilla = columnas > 1;

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
      <SafeAreaView
        style={[estilos.centrado, { backgroundColor: colores.fondo }]}
        edges={['bottom']}
      >
        <ActivityIndicator size='large' color={colores.acento} />
        <Text style={{ color: colores.textoSecundario }}>Cargando líneas...</Text>
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
      <FlatList
        key={columnas}
        data={lineas}
        numColumns={columnas}
        keyExtractor={(item) => item.id}
        columnWrapperStyle={esGrilla ? estilos.filaGrilla : undefined}
        contentContainerStyle={esGrilla ? estilos.contenidoGrilla : undefined}
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/linea/[id]',
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
            <View style={[estilos.badge, { backgroundColor: item.color }]}>
              <Text style={estilos.numero}>{item.numero}</Text>
            </View>
            <View style={esGrilla ? estilos.textoGrilla : undefined}>
              <Text style={[estilos.nombre, { color: colores.texto }]}>
                {item.nombre}
              </Text>
              <Text style={[estilos.empresa, { color: colores.textoSecundario }]}>
                {item.empresa}
              </Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <Text style={{ color: colores.textoSecundario, padding: 16 }}>
            No hay líneas.
          </Text>
        }
      />
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1 },
  centrado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  contenidoGrilla: {
    padding: 8,
  },
  filaGrilla: {
    gap: 8,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  celdaGrilla: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'flex-start',
    borderBottomWidth: 0,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    marginBottom: 8,
  },
  textoGrilla: {
    width: '100%',
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
  empresa: { fontSize: 14 },
  error: { fontSize: 16, textAlign: 'center' },
});

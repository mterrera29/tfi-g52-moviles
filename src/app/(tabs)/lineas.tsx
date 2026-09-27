import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FilaLinea } from '@/componentes/FilaLinea';
import { useTema } from '@/contextos/tema';
import { useColumnasLista } from '@/hooks/useColumnasLista';
import { obtenerLineas } from '@/servicios/lineas';
import type { Linea } from '@/tipos/linea';

export default function LineasScreen() {
  const { colores } = useTema();
  const { columnas, onLayout } = useColumnasLista();
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
        <ActivityIndicator
          size='large'
          color={colores.acento}
          accessibilityLabel='Cargando líneas'
        />
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
        <Text
          style={[estilos.error, { color: colores.error }]}
          accessibilityRole='alert'
        >
          {error}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      onLayout={onLayout}
      style={[estilos.contenedor, { backgroundColor: colores.fondo }]}
      edges={['bottom']}
    >
      <FlatList
        key={esGrilla ? `grilla-${columnas}` : 'lista'}
        data={lineas}
        {...(esGrilla
          ? { numColumns: columnas, columnWrapperStyle: estilos.filaGrilla }
          : {})}
        keyExtractor={(item) => item.id}
        contentContainerStyle={esGrilla ? estilos.contenidoGrilla : undefined}
        renderItem={({ item }) => (
          <FilaLinea linea={item} esGrilla={esGrilla} colores={colores} />
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
  error: { fontSize: 16, textAlign: 'center' },
});

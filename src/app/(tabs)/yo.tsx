import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { obtenerLineas } from '@/servicios/lineas';
import { obtenerParadas } from '@/servicios/paradas';
import { obtenerUsuario } from '@/servicios/usuario';
import type { Linea } from '@/tipos/linea';
import type { Parada } from '@/tipos/parada';
import type { Usuario } from '@/tipos/usuario';

export default function YoScreen() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [lineasFavoritas, setLineasFavoritas] = useState<Linea[]>([]);
  const [paradasFavoritas, setParadasFavoritas] = useState<Parada[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setError(null);

    const [respuestaUsuario, respuestaLineas, respuestaParadas] =
      await Promise.all([obtenerUsuario(), obtenerLineas(), obtenerParadas()]);

    if ('error' in respuestaUsuario) {
      setError(respuestaUsuario.error.mensaje);
      setCargando(false);
      return;
    }

    if ('error' in respuestaLineas) {
      setError(respuestaLineas.error.mensaje);
      setCargando(false);
      return;
    }

    if ('error' in respuestaParadas) {
      setError(respuestaParadas.error.mensaje);
      setCargando(false);
      return;
    }

    const usuarioActual = respuestaUsuario.datos;
    setUsuario(usuarioActual);

    setLineasFavoritas(
      respuestaLineas.datos.filter((linea) =>
        usuarioActual.lineasFavoritas.includes(linea.id),
      ),
    );

    setParadasFavoritas(
      respuestaParadas.datos.filter((parada) =>
        usuarioActual.paradasFavoritas.includes(parada.id),
      ),
    );

    setCargando(false);
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  if (cargando) {
    return (
      <SafeAreaView style={styles.centrado} edges={['bottom']}>
        <ActivityIndicator size='large' color='#0B3A5D' />
        <Text style={styles.mensaje}>Cargando usuario...</Text>
      </SafeAreaView>
    );
  }

  if (error || !usuario) {
    return (
      <SafeAreaView style={styles.centrado} edges={['bottom']}>
        <Text style={styles.error}>
          {error ?? 'No se pudo cargar el usuario.'}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.contenedor} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.tarjetaUsuario}>
          <Text style={styles.nombre}>{usuario.nombre}</Text>
          <Text style={styles.email}>{usuario.email}</Text>
          <Text style={styles.detalle}>
            Avisos activos: {usuario.avisosActivos ? 'Sí' : 'No'}
          </Text>
          <Text style={styles.detalle}>Tema: {usuario.tema}</Text>

          <Pressable style={styles.botonSecundario} disabled>
            <Text style={styles.botonSecundarioTexto}>
              Iniciar sesión (próximamente)
            </Text>
          </Pressable>
        </View>

        <Text style={styles.seccion}>Mis líneas favoritas</Text>

        {lineasFavoritas.length === 0 ? (
          <Text style={styles.mensaje}>No tenés líneas favoritas.</Text>
        ) : (
          lineasFavoritas.map((linea) => (
            <Pressable
              key={linea.id}
              onPress={() =>
                router.push({
                  pathname: '/linea/[id]',
                  params: { id: linea.id },
                })
              }
              style={({ pressed }) => [
                styles.fila,
                pressed && styles.filaPresionada,
              ]}
            >
              <View style={[styles.badge, { backgroundColor: linea.color }]}>
                <Text style={styles.badgeNumero}>{linea.numero}</Text>
              </View>
              <View style={styles.filaTexto}>
                <Text style={styles.filaTitulo}>{linea.nombre}</Text>
                <Text style={styles.filaDetalle}>{linea.empresa}</Text>
              </View>
            </Pressable>
          ))
        )}

        <Text style={styles.seccion}>Mis paradas favoritas</Text>

        {paradasFavoritas.length === 0 ? (
          <Text style={styles.mensaje}>No tenés paradas favoritas.</Text>
        ) : (
          paradasFavoritas.map((parada) => (
            <Pressable
              key={parada.id}
              onPress={() =>
                router.push({
                  pathname: '/parada/[id]',
                  params: { id: parada.id },
                })
              }
              style={({ pressed }) => [
                styles.fila,
                pressed && styles.filaPresionada,
              ]}
            >
              <View style={styles.iconoParada}>
                <Text style={styles.iconoParadaTexto}>P</Text>
              </View>
              <View style={styles.filaTexto}>
                <Text style={styles.filaTitulo}>{parada.nombre}</Text>
                <Text style={styles.filaDetalle}>
                  {parada.refugio ? 'Con refugio' : 'Sin refugio'}
                </Text>
              </View>
            </Pressable>
          ))
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
    gap: 10,
  },
  centrado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  tarjetaUsuario: {
    backgroundColor: '#F4F7FA',
    borderRadius: 12,
    padding: 16,
    gap: 6,
  },
  nombre: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  email: {
    fontSize: 15,
    color: '#5C6670',
  },
  detalle: {
    fontSize: 14,
    color: '#5C6670',
  },
  botonSecundario: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#E8EEF3',
  },
  botonSecundarioTexto: {
    color: '#5C6670',
    fontWeight: '600',
  },
  seccion: {
    marginTop: 8,
    fontSize: 17,
    fontWeight: '700',
    color: '#0B3A5D',
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#D0D7DE',
  },
  filaPresionada: {
    backgroundColor: '#F9FBFC',
  },
  filaTexto: {
    flex: 1,
    gap: 2,
  },
  filaTitulo: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  filaDetalle: {
    fontSize: 14,
    color: '#5C6670',
  },
  badge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeNumero: {
    color: '#fff',
    fontWeight: '700',
  },
  iconoParada: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0B3A5D',
  },
  iconoParadaTexto: {
    color: '#fff',
    fontWeight: '700',
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

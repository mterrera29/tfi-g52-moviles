import Ionicons from '@react-native-vector-icons/ionicons';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTema } from '@/contextos/tema';
import { useSinConexion } from '@/hooks/useSinConexion';
import { formatearAntiguedad, formatearFechaHora } from '@/lib/formatearAntiguedad';
import { leerTexto } from '@/lib/almacenClaveValor';
import { CLAVES } from '@/servicios/claves';

type Props = {
  // true: arriba de todo, ocupando la barra de estado. false: debajo del header de una pantalla.
  ocupaBarraDeEstado?: boolean;
};

export function AvisoSinConexion({ ocupaBarraDeEstado = true }: Props) {
  const sinConexion = useSinConexion();
  const { colores } = useTema();
  const insets = useSafeAreaInsets();
  const [ultima, setUltima] = useState<string | null>(null);

  useEffect(() => {
    setUltima(leerTexto(CLAVES.ultimaSincronizacion));
  }, [sinConexion]);

  if (!sinConexion) {
    return null;
  }

  const antiguedad = formatearAntiguedad(ultima);
  const fechaHora = formatearFechaHora(ultima);
  const detalle =
    antiguedad && fechaHora
      ? `Datos guardados ${antiguedad} · ${fechaHora}`
      : 'Todavía no hay datos guardados en este dispositivo.';

  return (
    <View
      accessibilityRole='alert'
      accessibilityLiveRegion='polite'
      accessibilityLabel={`Sin conexión. ${detalle}`}
      // mismo color que el encabezado: el aviso queda integrado arriba
      style={[estilos.contenedor, { paddingTop: (ocupaBarraDeEstado ? insets.top : 0) + 8, paddingBottom: ocupaBarraDeEstado ? 4 : 12, backgroundColor: colores.headerFondo }]}
    >
      <View style={estilos.tarjeta}>
        <View style={estilos.icono}>
          <Ionicons name='cloud-offline-outline' size={20} color='#0B3A5D' />
        </View>
        <View style={estilos.textos}>
          <Text style={[estilos.titulo, { color: colores.headerTexto }]}>Sin conexión</Text>
          <Text style={[estilos.detalle, { color: colores.headerTexto }]} numberOfLines={2}>
            {detalle}
          </Text>
        </View>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    paddingHorizontal: 12,
    paddingBottom: 4,
  },
  tarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  icono: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FBBF24',
  },
  textos: {
    flex: 1,
    gap: 2,
  },
  titulo: {
    fontSize: 15,
    fontWeight: '700',
  },
  detalle: {
    fontSize: 13,
    opacity: 0.85,
  },
});

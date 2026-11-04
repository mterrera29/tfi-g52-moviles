import { useNetworkState } from 'expo-network';
import { StyleSheet, Text, View } from 'react-native';

import { useTema } from '@/contextos/tema';
import { formatearAntiguedad, formatearFechaHora } from '@/lib/formatearAntiguedad';
import { leerTexto } from '@/lib/almacenClaveValor';
import { CLAVES } from '@/servicios/claves';

export function AvisoSinConexion() {
  const red = useNetworkState();
  const { colores } = useTema();

  if (red.isInternetReachable !== false) {
    return null;
  }

  const ultima = leerTexto(CLAVES.ultimaSincronizacion);
  const antiguedad = formatearAntiguedad(ultima);
  const fechaHora = formatearFechaHora(ultima);
  const detalle =
    antiguedad && fechaHora
      ? `Información ${antiguedad} (última actualización: ${fechaHora}).`
      : 'Todavía no hay una descarga guardada en este dispositivo.';

  return (
    <View
      accessibilityRole='alert'
      accessibilityLiveRegion='polite'
      style={[
        estilos.contenedor,
        {
          backgroundColor: colores.tarjetaAvisoSuspension,
          borderBottomColor: colores.borde,
        },
      ]}
    >
      <Text style={[estilos.titulo, { color: colores.texto }]}>
        Sin conexión — mostrando datos guardados
      </Text>
      <Text style={[estilos.detalle, { color: colores.textoSecundario }]}>{detalle}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  titulo: {
    fontSize: 14,
    fontWeight: '700',
  },
  detalle: {
    fontSize: 13,
  },
});

import Ionicons from '@react-native-vector-icons/ionicons';
import { StyleSheet, View } from 'react-native';

import { useTema } from '@/contextos/tema';

const AZUL = '#0D5CAB';
const BLANCO = '#FFFFFF';

/** Cartel de parada de colectivo sobre su poste (decorativo). */
export function CartelParada({
  tamano = 44,
  color = AZUL,
  colorIcono = BLANCO,
  colorBorde = BLANCO,
}: {
  tamano?: number;
  color?: string;
  colorIcono?: string;
  colorBorde?: string;
}) {
  const { modo } = useTema();
  const poste = modo === 'oscuro' ? '#9AA5B1' : '#5B6770';
  const cartel = tamano * 0.64;

  return (
    <View
      importantForAccessibility='no-hide-descendants'
      accessibilityElementsHidden
      style={{ width: tamano, height: tamano, alignItems: 'center' }}
    >
      <View
        style={[
          estilos.cartel,
          { width: cartel, height: cartel, borderRadius: tamano * 0.1, borderWidth: Math.max(1.5, tamano * 0.04), backgroundColor: color, borderColor: colorBorde },
        ]}
      >
        <Ionicons name='bus' size={cartel * 0.62} color={colorIcono} />
      </View>
      <View style={{ width: Math.max(3, tamano * 0.08), flex: 1, backgroundColor: poste }} />
      <View style={{ width: tamano * 0.4, height: Math.max(2, tamano * 0.06), borderRadius: 2, backgroundColor: poste }} />
    </View>
  );
}

const estilos = StyleSheet.create({
  cartel: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 1.5,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
});

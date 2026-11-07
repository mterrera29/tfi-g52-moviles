import { Text, View } from 'react-native';
import { useTema } from '@/contextos/tema';
import type { PropsMapa } from './MapaTipos';

export function Mapa({ descripcion }: PropsMapa) {
  const { colores } = useTema();
  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 16, backgroundColor: colores.fondoSecundario }}>
      <Text accessibilityLabel={descripcion} style={{ color: colores.texto }}>
        El mapa está disponible en la app para Android e iOS. Podés buscar la parada por nombre desde Paradas.
      </Text>
    </View>
  );
}

import { StyleSheet, Text, View } from 'react-native';

import { useTema } from '@/contextos/tema';
import { contrasteSobreColor, tamanoNumeroBadge } from '@/lib/colorCartelParada';

const TAMANOS = { chico: 34, medio: 46, grande: 58 } as const;

type TamanoBadge = keyof typeof TAMANOS;
const VIDRIO = '#0D3A5C';
const BLANCO = '#FFFFFF';

/** Frente de colectivo (como el logo de la app) en el color de la línea, con el número en el parabrisas. */
export function BadgeLinea({
  numero,
  color,
  tamano = 'medio',
  accessibilityLabel,
}: {
  numero: string;
  color?: string | null;
  tamano?: TamanoBadge;
  accessibilityLabel?: string;
}) {
  const { colores } = useTema();
  const texto = numero.trim() || '?';
  const { fondo } = contrasteSobreColor(color, colores.acento);
  const s = TAMANOS[tamano];
  const tipo = tamanoNumeroBadge(texto, Math.round(s * 0.36));

  const anchoCuerpo = s * 0.8;
  const izquierdaCuerpo = (s - anchoCuerpo) / 2;
  const luz = Math.max(4, Math.round(s * 0.12));

  return (
    <View
      accessible={!!accessibilityLabel}
      accessibilityLabel={accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}
      accessibilityElementsHidden={!accessibilityLabel}
      style={{ width: s, height: s }}
    >
      {/* Espejos */}
      <View
        style={[
          estilos.espejo,
          { backgroundColor: fondo, left: s * 0.03, width: s * 0.09, height: s * 0.3, top: s * 0.2, borderRadius: s * 0.03 },
        ]}
      />
      <View
        style={[
          estilos.espejo,
          { backgroundColor: fondo, right: s * 0.03, width: s * 0.09, height: s * 0.3, top: s * 0.2, borderRadius: s * 0.03 },
        ]}
      />
      {/* Carrocería */}
      <View
        style={[
          estilos.cuerpo,
          {
            backgroundColor: fondo,
            left: izquierdaCuerpo,
            width: anchoCuerpo,
            top: s * 0.04,
            height: s * 0.92,
            borderRadius: s * 0.17,
          },
        ]}
      >
        <View
          style={[
            estilos.vidrio,
            {
              backgroundColor: VIDRIO,
              marginHorizontal: s * 0.05,
              marginTop: s * 0.08,
              height: s * 0.48,
              borderRadius: s * 0.1,
            },
          ]}
        >
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.55}
            maxFontSizeMultiplier={1.2}
            style={[estilos.numero, { fontSize: tipo, lineHeight: tipo + 2 }]}
          >
            {texto}
          </Text>
        </View>
        <View style={[estilos.luces, { paddingHorizontal: s * 0.08, marginTop: s * 0.06 }]}>
          <View style={{ width: luz, height: luz, borderRadius: luz, backgroundColor: BLANCO }} />
          <View style={{ width: luz, height: luz, borderRadius: luz, backgroundColor: BLANCO }} />
        </View>
        <View style={[estilos.paragolpe, { height: s * 0.1 }]} />
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  espejo: { position: 'absolute' },
  cuerpo: { position: 'absolute', overflow: 'hidden' },
  vidrio: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden', paddingHorizontal: 2 },
  numero: { color: BLANCO, fontWeight: '800', textAlign: 'center' },
  luces: { flexDirection: 'row', justifyContent: 'space-between' },
  paragolpe: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
  },
});

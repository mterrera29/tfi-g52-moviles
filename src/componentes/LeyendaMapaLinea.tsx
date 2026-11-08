import { StyleSheet, Text, View } from 'react-native';

import { useTema } from '@/contextos/tema';

type PropsLeyendaMapaLinea = {
  colorIda: string;
  colorVuelta: string;
  colorDesvio: string;
  hayDesvio: boolean;
  compacta?: boolean;
};

export function LeyendaMapaLinea({
  colorIda,
  colorVuelta,
  colorDesvio,
  hayDesvio,
  compacta = false,
}: PropsLeyendaMapaLinea) {
  const { colores } = useTema();

  return (
    <View
      accessible
      accessibilityRole='summary'
      accessibilityLabel={
        hayDesvio
          ? 'Leyenda: ida en azul continuo, vuelta en magenta discontinuo. Donde se superponen se ven los dos colores. Las flechas siguen el orden de puntos de cada sentido. Desvío en naranja punteado.'
          : 'Leyenda: ida en azul continuo, vuelta en magenta discontinuo. Donde se superponen se ven los dos colores. Las flechas siguen el orden de puntos de cada sentido.'
      }
      pointerEvents='none'
      style={[
        estilos.caja,
        {
          backgroundColor: colores.fondo,
          borderColor: colores.borde,
        },
        compacta ? estilos.cajaCompacta : null,
      ]}
    >
      <View style={estilos.fila}>
        <View style={[estilos.muestra, { backgroundColor: colorIda }]} />
        <Text style={[estilos.texto, { color: colores.texto }]}>Ida, continua</Text>
      </View>
      <View style={estilos.fila}>
        <View style={[estilos.muestra, estilos.discontinua, { borderColor: colorVuelta }]} />
        <Text style={[estilos.texto, { color: colores.texto }]}>Vuelta, discontinua</Text>
      </View>
      {hayDesvio ? (
        <View style={estilos.fila}>
          <View style={[estilos.muestra, estilos.discontinua, { borderColor: colorDesvio }]} />
          <Text style={[estilos.texto, { color: colores.texto }]}>Desvío</Text>
        </View>
      ) : null}
      {compacta ? null : (
        <Text style={[estilos.ayuda, { color: colores.textoSecundario }]}>
          Si ida y vuelta coinciden se ven los dos colores. Las flechas no son paradas ni el desvío.
        </Text>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  caja: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 4,
    maxWidth: 220,
  },
  cajaCompacta: {
    maxWidth: 180,
    paddingVertical: 4,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  muestra: {
    width: 22,
    height: 6,
    borderRadius: 2,
  },
  discontinua: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderStyle: 'dashed',
    height: 0,
  },
  texto: {
    fontSize: 12,
    fontWeight: '600',
  },
  ayuda: {
    fontSize: 11,
    marginTop: 2,
  },
});

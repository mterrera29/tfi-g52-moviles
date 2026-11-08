import Ionicons from '@react-native-vector-icons/ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Mapa } from '@/componentes/Mapa';
import { LeyendaMapaLinea } from '@/componentes/LeyendaMapaLinea';
import { useTema } from '@/contextos/tema';
import type { TrazadoAlternativoMapa } from '@/lib/trazadoAlternativo';
import type { Recorrido } from '@/tipos/linea';
import type { Parada } from '@/tipos/parada';

type PropsMapaRecorridoLinea = {
  numeroLinea: string;
  colorLinea?: string;
  recorridos: Recorrido[];
  paradas: Parada[];
  trazadosAlternativos: TrazadoAlternativoMapa[];
  compacto?: boolean;
  onPantallaCompleta?: () => void;
};

export function descripcionMapaLinea(numeroLinea: string, hayDesvio: boolean): string {
  const base =
    `Mapa de los recorridos de la línea ${numeroLinea}. Ida en azul continuo, vuelta en magenta discontinuo. ` +
    'Donde se superponen se ven los dos colores. Las flechas siguen el orden de puntos de cada sentido.';
  if (!hayDesvio) return base;
  return `${base} Desvío vigente con línea naranja punteada: es el trazado publicado en el aviso, no una ruta calculada.`;
}

export function MapaRecorridoLinea({
  numeroLinea,
  colorLinea,
  recorridos,
  paradas,
  trazadosAlternativos,
  compacto = false,
  onPantallaCompleta,
}: PropsMapaRecorridoLinea) {
  const { colores, modo } = useTema();
  const hayDesvio = trazadosAlternativos.length > 0;

  return (
    <View style={compacto ? estilos.compacto : estilos.completo}>
      <Mapa
        recorridos={recorridos}
        paradas={paradas}
        trazadosAlternativos={trazadosAlternativos}
        colorParada={colorLinea}
        colorIda={colores.mapaIda}
        colorVuelta={colores.mapaVuelta}
        colorDesvio={colores.mapaDesvio}
        estiloInterfaz={modo === 'oscuro' ? 'dark' : 'light'}
        descripcion={descripcionMapaLinea(numeroLinea, hayDesvio)}
      />
      <View pointerEvents='box-none' style={estilos.leyenda}>
        <LeyendaMapaLinea
          colorIda={colores.mapaIda}
          colorVuelta={colores.mapaVuelta}
          colorDesvio={colores.mapaDesvio}
          hayDesvio={hayDesvio}
          compacta={compacto}
        />
      </View>
      {onPantallaCompleta ? (
        <Pressable
          accessibilityRole='button'
          accessibilityLabel='Ver mapa en pantalla completa'
          accessibilityHint='Abre el recorrido de la línea a pantalla completa'
          hitSlop={8}
          onPress={onPantallaCompleta}
          style={({ pressed }) => [
            estilos.ampliar,
            {
              backgroundColor: colores.fondo,
              borderColor: colores.borde,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Ionicons name='expand-outline' size={22} color={colores.acento} />
          <Text style={[estilos.ampliarTexto, { color: colores.acento }]}>Pantalla completa</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  compacto: {
    height: 280,
  },
  completo: {
    flex: 1,
  },
  leyenda: {
    position: 'absolute',
    left: 8,
    bottom: 12,
  },
  ampliar: {
    position: 'absolute',
    top: 8,
    right: 8,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  ampliarTexto: {
    fontSize: 13,
    fontWeight: '700',
  },
});

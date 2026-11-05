import { StyleSheet, Text, View } from 'react-native';

import { useTema } from '@/contextos/tema';
import type { ColoresTema } from '@/temas/paleta';
import type { Aviso, Gravedad } from '@/tipos/aviso';
import type { Linea } from '@/tipos/linea';

function etiquetaGravedad(gravedad: Gravedad) {
  if (gravedad === 'desvio') return 'Desvío';
  if (gravedad === 'suspension') return 'Suspensión';
  return 'Informativo';
}

function colorGravedad(gravedad: Gravedad, colores: ColoresTema) {
  if (gravedad === 'desvio') return colores.tarjetaAvisoDesvio;
  if (gravedad === 'suspension') return colores.tarjetaAvisoSuspension;
  return colores.tarjetaAvisoInfo;
}

function formatearFecha(iso: string) {
  const fecha = new Date(iso);
  return fecha.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
  });
}

export function TarjetaAviso({ aviso, lineasPorId }: {
  aviso: Aviso;
  lineasPorId: Record<string, Linea>;
}) {
  const { colores } = useTema();
  const numerosLineas = aviso.lineaIds
    .map((lineaId) => lineasPorId[lineaId]?.numero)
    .filter(Boolean)
    .join(', ');

  return (
    <View
      accessible
      accessibilityRole='text'
      accessibilityLabel={`${etiquetaGravedad(aviso.gravedad)}. ${aviso.titulo}. Líneas ${numerosLineas}. ${aviso.detalle}. Desde ${formatearFecha(aviso.desde)}${aviso.hasta ? `. Hasta ${formatearFecha(aviso.hasta)}` : ''}`}
      style={[
        estilos.tarjeta,
        { backgroundColor: colorGravedad(aviso.gravedad, colores) },
      ]}
    >
      <Text style={[estilos.etiqueta, { color: colores.acento }]}>
        {etiquetaGravedad(aviso.gravedad)}
      </Text>
      <Text style={[estilos.titulo, { color: colores.texto }]}>
        {aviso.titulo}
      </Text>
      <View style={estilos.lineasFila}>
        {aviso.lineaIds.map((lineaId) => {
          const linea = lineasPorId[lineaId];
  
          if (!linea) {
            return null;
          }
  
          return (
            <View
              key={lineaId}
              style={[estilos.badge, { backgroundColor: linea.color }]}
              importantForAccessibility='no-hide-descendants'
              accessibilityElementsHidden
            >
              <Text style={estilos.badgeNumero}>{linea.numero}</Text>
            </View>
          );
        })}
      </View>
      <Text style={[estilos.detalle, { color: colores.textoSecundario }]}>
        {aviso.detalle}
      </Text>
      <Text style={[estilos.fecha, { color: colores.textoSecundario }]}>
        Desde {formatearFecha(aviso.desde)}
        {aviso.hasta ? ` · Hasta ${formatearFecha(aviso.hasta)}` : ''}
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 10,
    gap: 6,
  },
  etiqueta: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  titulo: {
    fontSize: 17,
    fontWeight: '700',
  },
  lineasFila: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeNumero: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  detalle: {
    fontSize: 15,
  },
  fecha: {
    fontSize: 13,
  },
});

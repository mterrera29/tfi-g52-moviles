import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTema } from '@/contextos/tema';
import { consultarHorasLinea } from '@/servicios/consulta';
import type { RespuestaError } from '@/tipos/api';
import type { TipoDeDia } from '@/tipos/horario';
import type { Sentido } from '@/tipos/linea';

const DIAS: Array<{ id: TipoDeDia; texto: string }> = [
  { id: 'habil', texto: 'Hábiles' },
  { id: 'sabado', texto: 'Sábados' },
  { id: 'domingo', texto: 'Domingos' },
  { id: 'feriado', texto: 'Feriados' },
];

type Props = {
  lineaId: string;
  // Primera parada de cada sentido: de ahí salen las horas de la tabla.
  sentidos: Array<{ sentido: Sentido; destino: string; paradaId: string | null }>;
};

function Opcion({ texto, activa, alPresionar }: { texto: string; activa: boolean; alPresionar: () => void }) {
  const { colores } = useTema();
  return (
    <Pressable
      accessibilityRole='button'
      accessibilityState={{ selected: activa }}
      onPress={alPresionar}
      style={[
        estilos.opcion,
        { backgroundColor: activa ? colores.acento : colores.fondoSecundario, borderColor: colores.borde },
      ]}
    >
      <Text style={{ color: activa ? colores.acentoTexto : colores.texto, fontWeight: '600' }}>{texto}</Text>
    </Pressable>
  );
}

export function HorariosLinea({ lineaId, sentidos }: Props) {
  const { colores } = useTema();
  const [dia, setDia] = useState<TipoDeDia>('habil');
  const [sentido, setSentido] = useState<Sentido>(sentidos[0]?.sentido ?? 'ida');
  const actual = sentidos.find((item) => item.sentido === sentido);
  const paradaId = actual?.paradaId ?? null;

  const { data, isPending, error } = useQuery({
    queryKey: ['horas-linea', lineaId, sentido, dia, paradaId],
    enabled: !!paradaId,
    queryFn: () => consultarHorasLinea(lineaId, paradaId as string, sentido, dia),
  });

  return (
    <View style={estilos.contenedor}>
      <Text style={[estilos.titulo, { color: colores.acento }]}>Horarios según la tabla</Text>
      <View style={estilos.fila}>
        {DIAS.map((item) => (
          <Opcion key={item.id} texto={item.texto} activa={dia === item.id} alPresionar={() => setDia(item.id)} />
        ))}
      </View>
      <View style={estilos.fila}>
        {sentidos.map((item) => (
          <Opcion
            key={item.sentido}
            texto={`${item.sentido === 'ida' ? 'Ida' : 'Vuelta'} → ${item.destino}`}
            activa={sentido === item.sentido}
            alPresionar={() => setSentido(item.sentido)}
          />
        ))}
      </View>

      {!paradaId ? (
        <Text style={{ color: colores.textoSecundario }}>Este sentido no tiene paradas cargadas.</Text>
      ) : isPending ? (
        <ActivityIndicator color={colores.acento} accessibilityLabel='Cargando horarios' />
      ) : error ? (
        <Text style={{ color: colores.error }}>{(error as unknown as RespuestaError).error?.mensaje ?? 'No pudimos cargar los horarios.'}</Text>
      ) : data.length === 0 ? (
        <Text style={{ color: colores.textoSecundario }}>No hay servicio este tipo de día.</Text>
      ) : (
        <>
          <Text style={{ color: colores.textoSecundario }}>
            Salidas desde la primera parada · {data.length} servicios
          </Text>
          <View style={estilos.horas}>
            {data.map((hora) => (
              <Text key={hora} style={[estilos.hora, { color: colores.texto, borderColor: colores.borde }]}>
                {hora}
              </Text>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { gap: 8 },
  titulo: { fontSize: 17, fontWeight: '700' },
  fila: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  opcion: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 8, borderWidth: 1 },
  horas: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  hora: { paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderRadius: 6, fontVariant: ['tabular-nums'] },
});

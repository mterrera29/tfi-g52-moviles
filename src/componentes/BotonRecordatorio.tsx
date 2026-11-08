import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { useTema } from '@/contextos/tema';
import {
  cancelarRecordatorioPedido,
  hayRecordatorio,
  programarRecordatorioPedido,
} from '@/servicios/notificaciones';
import type { PedidoRecordatorio } from '@/lib/recordatorioHorario';
import { calcularRecordatorio } from '@/lib/recordatorioHorario';

export function BotonRecordatorio({ pedido }: { pedido: PedidoRecordatorio }) {
  const { colores } = useTema();
  const calculo = calcularRecordatorio(pedido, new Date());
  const [programado, setProgramado] = useState(() =>
    hayRecordatorio(pedido.paradaId, pedido.horarioId, pedido.fechaServicio),
  );
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  if (!calculo.ok && !programado) {
    return null;
  }

  async function alternar() {
    setCargando(true);
    setMensaje(null);
    try {
      if (programado) {
        await cancelarRecordatorioPedido(pedido.paradaId, pedido.horarioId, pedido.fechaServicio);
        setProgramado(false);
        setMensaje('Recordatorio cancelado.');
      } else {
        const resultado = await programarRecordatorioPedido(pedido);
        if (!resultado.ok) {
          setMensaje(resultado.motivo);
        } else {
          setProgramado(true);
          setMensaje('Te avisamos 10 min antes, según la tabla.');
        }
      }
    } catch {
      setMensaje('No se pudo actualizar el recordatorio.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <>
      <Pressable
        accessibilityRole='button'
        accessibilityLabel={programado ? 'Cancelar recordatorio de 10 minutos' : 'Avisame 10 minutos antes'}
        accessibilityState={{ disabled: cargando }}
        onPress={() => {
          void alternar();
        }}
        style={({ pressed }) => [
          estilos.boton,
          { borderColor: colores.acento, opacity: pressed || cargando ? 0.7 : 1 },
        ]}
      >
        {cargando ? (
          <ActivityIndicator color={colores.acento} />
        ) : (
          <Text style={[estilos.texto, { color: colores.acento }]}>
            {programado ? 'Cancelar aviso' : 'Avisame 10 min antes'}
          </Text>
        )}
      </Pressable>
      {mensaje ? (
        <Text accessibilityLiveRegion='polite' style={{ color: colores.textoSecundario, fontSize: 13 }}>
          {mensaje}
        </Text>
      ) : null}
    </>
  );
}

const estilos = StyleSheet.create({
  boton: {
    minHeight: 44,
    justifyContent: 'center',
    alignSelf: 'flex-start',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  texto: {
    fontWeight: '600',
    fontSize: 14,
  },
});

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { EstadoError } from '@/componentes/EstadoError';
import { useSesion } from '@/contextos/sesion';
import { useTema } from '@/contextos/tema';
import { confirmarReporte, consultarReportesParada } from '@/servicios/reportes';
import type { RespuestaError } from '@/tipos/api';
import type { Linea } from '@/tipos/linea';
import type { MotivoDemora } from '@/tipos/reporte';

const TEXTO_MOTIVO: Record<MotivoDemora, string> = {
  no_paso: 'no pasó',
  paso_lleno: 'pasó lleno y no paró',
  demorado: 'viene demorado',
  unidad_rota: 'unidad rota',
  calle_cortada: 'calle cortada',
};

function haceCuanto(fechaHora: string): string {
  const minutos = Math.max(0, Math.round((Date.now() - new Date(fechaHora).getTime()) / 60000));
  if (minutos < 1) return 'recién';
  if (minutos < 60) return `hace ${minutos} min`;
  return `hace ${Math.floor(minutos / 60)} h`;
}

export function ReportesParada({ paradaId, lineas }: { paradaId: string; lineas: Linea[] }) {
  const { colores } = useTema();
  const { sesion } = useSesion();
  const queryClient = useQueryClient();
  const clave = ['reportes', paradaId];

  const { data, isPending, error, refetch } = useQuery({
    queryKey: clave,
    queryFn: () => consultarReportesParada(paradaId),
  });

  const confirmar = useMutation({
    mutationFn: confirmarReporte,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: clave }),
  });

  const mensajeError = confirmar.error
    ? (confirmar.error as unknown as RespuestaError).error.mensaje
    : null;

  return (
    <View style={estilos.contenedor}>
      <Text style={[estilos.titulo, { color: colores.acento }]}>Reportes de otros pasajeros</Text>

      {isPending ? (
        <ActivityIndicator color={colores.acento} accessibilityLabel='Cargando reportes' />
      ) : error ? (
        // mismo patrón que el resto: el error siempre tiene una salida (U05.T01 diap. 7)
        <EstadoError
          mensaje='No pudimos cargar los reportes. Necesitan conexión a internet.'
          onReintentar={() => { void refetch(); }}
        />
      ) : data.length === 0 ? (
        <Text style={{ color: colores.textoSecundario }}>
          Nadie reportó demoras en esta parada en la última hora y media.
        </Text>
      ) : (
        data.map((reporte) => {
          const linea = lineas.find((item) => item.id === reporte.lineaId);
          const esPropio = reporte.usuarioId === sesion?.usuario.id;
          const resumen = `Línea ${linea?.numero ?? '?'}: ${TEXTO_MOTIVO[reporte.motivo]}`;
          return (
            <View key={reporte.id} style={[estilos.fila, { borderColor: colores.borde }]}>
              <View style={estilos.texto}>
                <Text style={[estilos.resumen, { color: colores.texto }]}>{resumen}</Text>
                <Text style={{ color: colores.textoSecundario }}>
                  {haceCuanto(reporte.fechaHora)} · {reporte.confirmaciones}{' '}
                  {reporte.confirmaciones === 1 ? 'confirmación' : 'confirmaciones'}
                </Text>
                {reporte.comentario ? (
                  <Text style={{ color: colores.textoSecundario }}>“{reporte.comentario}”</Text>
                ) : null}
              </View>
              {esPropio ? (
                <Text style={{ color: colores.textoSecundario }}>Tuyo</Text>
              ) : (
                <Pressable
                  accessibilityRole='button'
                  accessibilityLabel={`Confirmar reporte. ${resumen}`}
                  disabled={confirmar.isPending}
                  onPress={() => {
                    if (!sesion) {
                      router.push('/login');
                      return;
                    }
                    confirmar.mutate(reporte.id);
                  }}
                  style={({ pressed }) => [
                    estilos.boton,
                    { borderColor: colores.acento, opacity: pressed || confirmar.isPending ? 0.6 : 1 },
                  ]}
                >
                  <Text style={{ color: colores.acento, fontWeight: '600' }}>Confirmar</Text>
                </Pressable>
              )}
            </View>
          );
        })
      )}

      {mensajeError ? (
        <Text accessibilityLiveRegion='polite' style={{ color: colores.error }}>
          {mensajeError}
        </Text>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { gap: 8 },
  titulo: { fontSize: 17, fontWeight: '700' },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderWidth: 1,
    borderRadius: 10,
  },
  texto: { flex: 1, gap: 2 },
  resumen: { fontSize: 16, fontWeight: '600' },
  boton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 8,
  },
});

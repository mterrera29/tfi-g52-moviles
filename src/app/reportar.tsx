import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { EstadoError } from '@/componentes/EstadoError';
import { useSesion } from '@/contextos/sesion';
import { useTema } from '@/contextos/tema';
import { copiarFoto, elegirFoto, enviarReporte, sacarFoto } from '@/servicios/reportes';
import type { MotivoDemora } from '@/tipos/reporte';
import type { RespuestaError } from '@/tipos/api';

const MOTIVOS: { valor: MotivoDemora; etiqueta: string }[] = [
  { valor: 'no_paso', etiqueta: 'No pasó' },
  { valor: 'paso_lleno', etiqueta: 'Pasó lleno' },
  { valor: 'demorado', etiqueta: 'Demorado' },
  { valor: 'unidad_rota', etiqueta: 'Unidad rota' },
  { valor: 'calle_cortada', etiqueta: 'Calle cortada' },
];

export default function ReportarScreen() {
  const { colores } = useTema();
  const { sesion } = useSesion();
  const params = useLocalSearchParams<{ paradaId: string; lineaId?: string }>();
  const paradaId = Array.isArray(params.paradaId) ? params.paradaId[0] : params.paradaId;
  const lineaId = Array.isArray(params.lineaId) ? params.lineaId[0] : params.lineaId;

  const [motivo, setMotivo] = useState<MotivoDemora | null>(null);
  const [comentario, setComentario] = useState('');
  const [fotoUri, setFotoUri] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<RespuestaError['error'] | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  if (!sesion) {
    return (
      <SafeAreaView style={[estilos.centrado, { backgroundColor: colores.fondo }]} edges={['bottom']}>
        <Text style={[estilos.titulo, { color: colores.texto }]}>Iniciá sesión para reportar</Text>
        <Text style={[estilos.descripcion, { color: colores.textoSecundario }]}>
          Los reportes de demora requieren una cuenta.
        </Text>
        <Pressable
          accessibilityRole='button'
          accessibilityLabel='Ir a iniciar sesión'
          onPress={() => router.push('/login')}
          style={({ pressed }) => [estilos.boton, { backgroundColor: colores.acento, opacity: pressed ? 0.7 : 1 }]}
        >
          <Text style={[estilos.botonTexto, { color: colores.acentoTexto }]}>Iniciar sesión</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  async function elegirFotoGaleria() {
    const uri = await elegirFoto();
    if (uri) setFotoUri(uri);
  }

  async function tomarFoto() {
    const uri = await sacarFoto();
    if (uri) setFotoUri(uri);
  }

  async function enviar() {
    if (!motivo || !paradaId) return;
    setEnviando(true);
    setError(null);
    setExito(null);

    try {
      const fotoPersistente = fotoUri ? await copiarFoto(fotoUri) : null;
      const resultado = await enviarReporte({
        lineaId: lineaId ?? '',
        paradaId,
        usuarioId: sesion?.usuario.id ?? '',
        motivo,
        comentario: comentario.trim() || null,
        fotoUri: fotoPersistente,
        fechaHora: new Date().toISOString(),
      });

      if (!resultado.ok) {
        setError(resultado.error);
        return;
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setExito(resultado.encolado
        ? 'Reporte guardado. Se enviará cuando haya conexión.'
        : 'Reporte enviado. ¡Gracias!');
      setTimeout(() => router.back(), 1500);
    } catch {
      setError({ codigo: 'ERROR_INTERNO', mensaje: 'No pudimos enviar el reporte.' });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <SafeAreaView style={[estilos.contenedor, { backgroundColor: colores.fondo }]} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Reportar demora' }} />
      <ScrollView contentContainerStyle={estilos.scroll}>
        <Text style={[estilos.titulo, { color: colores.texto }]}>¿Qué pasó?</Text>
        <Text style={[estilos.descripcion, { color: colores.textoSecundario }]}>
          Elegí el motivo y, si querés, sacá una foto o agregá un comentario.
        </Text>

        <View style={estilos.motivos}>
          {MOTIVOS.map((item) => (
            <Pressable
              key={item.valor}
              accessibilityRole='button'
              accessibilityLabel={item.etiqueta}
              accessibilityState={{ selected: motivo === item.valor }}
              onPress={() => setMotivo(item.valor)}
              style={({ pressed }) => [
                estilos.motivo,
                {
                  backgroundColor: motivo === item.valor ? colores.acento : colores.fondoSecundario,
                  borderColor: motivo === item.valor ? colores.acento : colores.borde,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Text style={[estilos.motivoTexto, { color: motivo === item.valor ? colores.acentoTexto : colores.texto }]}>
                {item.etiqueta}
              </Text>
            </Pressable>
          ))}
        </View>

        <TextInput
          accessibilityLabel='Comentario opcional'
          placeholder='Comentario (opcional)'
          placeholderTextColor={colores.textoSecundario}
          value={comentario}
          onChangeText={setComentario}
          multiline
          style={[estilos.input, { backgroundColor: colores.fondoSecundario, borderColor: colores.borde, color: colores.texto }]}
        />

        <View style={estilos.fotoActions}>
          <Pressable
            accessibilityRole='button'
            accessibilityLabel='Sacar foto'
            onPress={() => { void tomarFoto(); }}
            style={({ pressed }) => [estilos.botonSecundario, { borderColor: colores.borde, opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={[estilos.botonSecundarioTexto, { color: colores.texto }]}>Sacar foto</Text>
          </Pressable>
          <Pressable
            accessibilityRole='button'
            accessibilityLabel='Elegir de galería'
            onPress={() => { void elegirFotoGaleria(); }}
            style={({ pressed }) => [estilos.botonSecundario, { borderColor: colores.borde, opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={[estilos.botonSecundarioTexto, { color: colores.texto }]}>Elegir de galería</Text>
          </Pressable>
        </View>

        {fotoUri && (
          <Image source={{ uri: fotoUri }} style={[estilos.preview, { borderColor: colores.borde }]} />
        )}

        {error && <EstadoError mensaje={error.mensaje} onReintentar={() => setError(null)} />}
        {exito && (
          <Text accessibilityLiveRegion='polite' style={[estilos.exito, { color: colores.acento }]}>
            {exito}
          </Text>
        )}

        <Pressable
          accessibilityRole='button'
          accessibilityLabel='Enviar reporte'
          accessibilityState={{ disabled: !motivo || enviando }}
          disabled={!motivo || enviando}
          onPress={() => { void enviar(); }}
          style={({ pressed }) => [
            estilos.boton,
            {
              backgroundColor: colores.acento,
              opacity: pressed || !motivo || enviando ? 0.7 : 1,
            },
          ]}
        >
          {enviando ? (
            <ActivityIndicator color={colores.acentoTexto} accessibilityLabel='Enviando reporte' />
          ) : (
            <Text style={[estilos.botonTexto, { color: colores.acentoTexto }]}>Enviar reporte</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1 },
  scroll: { padding: 16, gap: 16 },
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  titulo: { fontSize: 24, fontWeight: '700' },
  descripcion: { fontSize: 15, lineHeight: 22 },
  motivos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  motivo: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, borderWidth: 1 },
  motivoTexto: { fontSize: 15, fontWeight: '600' },
  input: { minHeight: 80, padding: 12, borderRadius: 12, borderWidth: 1, textAlignVertical: 'top' },
  fotoActions: { flexDirection: 'row', gap: 8 },
  botonSecundario: { flex: 1, minHeight: 48, justifyContent: 'center', alignItems: 'center', borderRadius: 8, borderWidth: 1, paddingHorizontal: 12 },
  botonSecundarioTexto: { fontSize: 15, fontWeight: '600' },
  preview: { width: '100%', height: 200, borderRadius: 12, borderWidth: 1 },
  exito: { fontSize: 15, fontWeight: '600', textAlign: 'center' },
  boton: { minHeight: 52, justifyContent: 'center', alignItems: 'center', borderRadius: 12, paddingHorizontal: 16 },
  botonTexto: { fontSize: 16, fontWeight: '700' },
});

import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BadgeLinea } from '@/componentes/BadgeLinea';
import { EstadoError } from '@/componentes/EstadoError';
import { useSesion } from '@/contextos/sesion';
import { useTema } from '@/contextos/tema';
import {
  MOTIVOS_DEMORA,
  comentarioReporte,
  esquemaReporte,
  type DatosReporte,
} from '@/esquemas/reporte';
import { consultarParadaDetalle } from '@/servicios/consulta';
import { guardarYEnviarReporte, listarReportesPendientes } from '@/servicios/reportes';
import type { ItemColaReporte } from '@/lib/colaReportes';
import type { RespuestaError } from '@/tipos/api';
import type { MotivoDemora } from '@/tipos/reporte';

const ETIQUETA_MOTIVO: Record<MotivoDemora, string> = {
  no_paso: 'No pasó',
  paso_lleno: 'Pasó lleno',
  demorado: 'Demorado',
  unidad_rota: 'Unidad rota',
  calle_cortada: 'Calle cortada',
};

export default function ReportarScreen() {
  const { colores } = useTema();
  const { sesion } = useSesion();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ paradaId?: string; lineaId?: string }>();
  const paradaId = Array.isArray(params.paradaId) ? params.paradaId[0] : params.paradaId;
  const lineaInicial = Array.isArray(params.lineaId) ? params.lineaId[0] : params.lineaId;
  const camaraRef = useRef<CameraView>(null);
  const [permisoCamara, pedirPermisoCamara] = useCameraPermissions();
  const [mostrandoCamara, setMostrandoCamara] = useState(false);
  const [fotoUri, setFotoUri] = useState<string | null>(null);
  const [fotoMime, setFotoMime] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const [pendientes, setPendientes] = useState<ItemColaReporte[]>([]);

  const consulta = useQuery({
    queryKey: ['parada', paradaId, 'proximos', 3],
    queryFn: async () => {
      if (!paradaId) {
        throw { error: { codigo: 'VALIDACION_FALLIDA', mensaje: 'Falta la parada del reporte.' } };
      }
      return consultarParadaDetalle(paradaId, 3);
    },
    enabled: !!paradaId && !!sesion,
  });

  const lineas = consulta.data?.lineas ?? [];
  const lineaUnica = lineas.length === 1 ? lineas[0].id : '';

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<DatosReporte>({
    resolver: zodResolver(esquemaReporte),
    defaultValues: {
      paradaId: paradaId ?? '',
      lineaId: lineaInicial ?? lineaUnica,
      comentario: '',
    },
  });

  useEffect(() => {
    if (paradaId) setValue('paradaId', paradaId);
  }, [paradaId, setValue]);

  useEffect(() => {
    if (lineaInicial) setValue('lineaId', lineaInicial);
    else if (lineaUnica) setValue('lineaId', lineaUnica);
  }, [lineaInicial, lineaUnica, setValue]);

  useEffect(() => {
    if (!sesion) return;
    void listarReportesPendientes(sesion.usuario.id).then(setPendientes).catch(() => {});
  }, [sesion, mensaje]);

  async function sacarFoto() {
    setErrorAccion(null);
    if (Platform.OS === 'web') {
      setErrorAccion('En la web no se puede sacar foto con la cámara de la cátedra.');
      return;
    }
    if (!permisoCamara?.granted) {
      const resultado = await pedirPermisoCamara();
      if (!resultado.granted) {
        setErrorAccion('Sin permiso de cámara no se puede sacar la foto. Podés elegir una de la galería.');
        return;
      }
    }
    setMostrandoCamara(true);
  }

  async function capturarFoto() {
    try {
      const foto = await camaraRef.current?.takePictureAsync({ quality: 0.7 });
      if (!foto?.uri) return;
      setFotoUri(foto.uri);
      setFotoMime('image/jpeg');
      setMostrandoCamara(false);
    } catch {
      setErrorAccion('No se pudo sacar la foto. Probá de nuevo o elegí una de la galería.');
      setMostrandoCamara(false);
    }
  }

  async function elegirDeGaleria() {
    setErrorAccion(null);
    try {
      const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permiso.granted) {
        setErrorAccion('Sin permiso de galería no se puede elegir una foto.');
        return;
      }
      const resultado = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        allowsEditing: false,
      });
      if (resultado.canceled) return;
      const asset = resultado.assets[0];
      if (!asset?.uri) return;
      setFotoUri(asset.uri);
      setFotoMime(asset.mimeType ?? 'image/jpeg');
    } catch {
      setErrorAccion('No se pudo abrir la galería.');
    }
  }

  const enviar = async (datos: DatosReporte) => {
    if (!sesion) return;
    setEnviando(true);
    setErrorAccion(null);
    setMensaje(null);
    const resultado = await guardarYEnviarReporte({
      usuarioId: sesion.usuario.id,
      lineaId: datos.lineaId,
      paradaId: datos.paradaId,
      motivo: datos.motivo,
      comentario: comentarioReporte(datos.comentario),
      fotoUriOrigen: fotoUri,
      fotoMime,
    });
    setEnviando(false);
    if (resultado.resultado === 'rechazado') {
      setErrorAccion(resultado.mensaje);
      return;
    }
    void queryClient.invalidateQueries({ queryKey: ['reportes', datos.paradaId] });
    setMensaje(resultado.mensaje);
    setFotoUri(null);
    setFotoMime(null);
  };

  if (!sesion) {
    return (
      <SafeAreaView style={[estilos.centrado, { backgroundColor: colores.fondo }]} edges={['bottom']}>
        <Stack.Screen options={{ title: 'Reportar demora' }} />
        <Text style={[estilos.texto, { color: colores.texto, textAlign: 'center' }]}>
          Para reportar una demora tenés que iniciar sesión.
        </Text>
        <Pressable
          accessibilityRole='button'
          accessibilityLabel='Iniciar sesión'
          onPress={() => router.push('/login')}
          style={({ pressed }) => [
            estilos.boton,
            {
              backgroundColor: colores.acento,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Text style={[estilos.textoBoton, { color: colores.acentoTexto }]}>Iniciar sesión</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (!paradaId) {
    return (
      <SafeAreaView style={[estilos.centrado, { backgroundColor: colores.fondo }]} edges={['bottom']}>
        <Stack.Screen options={{ title: 'Reportar demora' }} />
        <Text style={[estilos.texto, { color: colores.texto }]}>
          Abrí una parada y desde ahí reportá la demora.
        </Text>
      </SafeAreaView>
    );
  }

  if (consulta.isPending) {
    return (
      <SafeAreaView style={[estilos.centrado, { backgroundColor: colores.fondo }]} edges={['bottom']}>
        <Stack.Screen options={{ title: 'Reportar demora' }} />
        <ActivityIndicator color={colores.acento} accessibilityLabel='Cargando parada' />
      </SafeAreaView>
    );
  }

  if (consulta.error || !consulta.data) {
    return (
      <SafeAreaView style={[estilos.centrado, { backgroundColor: colores.fondo }]} edges={['bottom']}>
        <Stack.Screen options={{ title: 'Reportar demora' }} />
        <EstadoError
          mensaje={(consulta.error as unknown as RespuestaError | undefined)?.error.mensaje ?? 'No se pudo cargar la parada.'}
          onReintentar={() => {
            void consulta.refetch();
          }}
        />
      </SafeAreaView>
    );
  }

  if (mostrandoCamara) {
    return (
      <SafeAreaView style={[estilos.contenedor, { backgroundColor: '#000' }]} edges={['bottom']}>
        <Stack.Screen options={{ title: 'Sacar foto' }} />
        <CameraView ref={camaraRef} style={{ flex: 1 }} facing='back' />
        <View style={estilos.barraCamara}>
          <Pressable
            accessibilityRole='button'
            accessibilityLabel='Cancelar foto'
            onPress={() => setMostrandoCamara(false)}
            style={estilos.botonCamara}
          >
            <Text style={estilos.textoCamara}>Cancelar</Text>
          </Pressable>
          <Pressable
            accessibilityRole='button'
            accessibilityLabel='Capturar foto'
            onPress={() => {
              void capturarFoto();
            }}
            style={estilos.botonCamara}
          >
            <Text style={estilos.textoCamara}>Capturar</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const parada = consulta.data.parada;

  return (
    <SafeAreaView style={[estilos.contenedor, { backgroundColor: colores.fondo }]} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Reportar demora' }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={estilos.scroll} keyboardShouldPersistTaps='handled'>
          <Text style={[estilos.texto, { color: colores.texto }]}>
            Parada {parada.nombre}. El reporte es de demora según lo que ves vos, no reemplaza los horarios de la tabla.
          </Text>

          <Text style={[estilos.etiqueta, { color: colores.texto }]}>Línea</Text>
          <Controller
            control={control}
            name='lineaId'
            render={({ field: { value, onChange } }) => (
              <View style={estilos.filaWrap}>
                {lineas.map((linea) => (
                  <Pressable
                    key={linea.id}
                    accessibilityRole='button'
                    accessibilityState={{ selected: value === linea.id }}
                    accessibilityLabel={`Línea ${linea.numero}`}
                    onPress={() => onChange(linea.id)}
                    style={({ pressed }) => [
                      {
                        padding: 4,
                        borderRadius: 14,
                        borderWidth: 2,
                        borderColor: value === linea.id ? colores.acento : 'transparent',
                        opacity: pressed ? 0.7 : value === linea.id ? 1 : 0.7,
                      },
                    ]}
                  >
                    <BadgeLinea numero={linea.numero} color={linea.color} tamano='medio' />
                  </Pressable>
                ))}
              </View>
            )}
          />
          {errors.lineaId ? (
            <Text accessibilityRole='alert' style={{ color: colores.error }}>
              {errors.lineaId.message}
            </Text>
          ) : null}

          <Text style={[estilos.etiqueta, { color: colores.texto }]}>Motivo</Text>
          <Controller
            control={control}
            name='motivo'
            render={({ field: { value, onChange } }) => (
              <View style={estilos.filaWrap}>
                {MOTIVOS_DEMORA.map((motivo) => (
                  <Pressable
                    key={motivo}
                    accessibilityRole='button'
                    accessibilityState={{ selected: value === motivo }}
                    accessibilityLabel={ETIQUETA_MOTIVO[motivo]}
                    onPress={() => onChange(motivo)}
                    style={({ pressed }) => [
                      estilos.chip,
                      {
                        backgroundColor: value === motivo ? colores.acento : colores.fondoSecundario,
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                  >
                    <Text style={{ color: value === motivo ? colores.acentoTexto : colores.texto }}>
                      {ETIQUETA_MOTIVO[motivo]}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          />
          {errors.motivo ? (
            <Text accessibilityRole='alert' style={{ color: colores.error }}>
              {errors.motivo.message}
            </Text>
          ) : null}

          <Text style={[estilos.etiqueta, { color: colores.texto }]}>Comentario (opcional)</Text>
          <Controller
            control={control}
            name='comentario'
            render={({ field: { value, onChange, onBlur } }) => (
              <TextInput
                value={value ?? ''}
                onChangeText={onChange}
                onBlur={onBlur}
                multiline
                accessibilityLabel='Comentario del reporte'
                placeholder='Algo breve de lo que pasó'
                placeholderTextColor={colores.textoSecundario}
                style={[
                  estilos.input,
                  { color: colores.texto, borderColor: colores.borde, backgroundColor: colores.fondoSecundario },
                ]}
              />
            )}
          />

          <Text style={[estilos.etiqueta, { color: colores.texto }]}>Foto (opcional)</Text>
          {fotoUri ? (
            <Image source={{ uri: fotoUri }} style={estilos.preview} accessibilityLabel='Foto elegida para el reporte' />
          ) : null}
          <View style={estilos.filaWrap}>
            <Pressable
              accessibilityRole='button'
              accessibilityLabel='Sacar foto'
              onPress={() => {
                void sacarFoto();
              }}
              style={({ pressed }) => [
                estilos.botonSecundario,
                { borderColor: colores.acento, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={{ color: colores.acento, fontWeight: '600' }}>Sacar foto</Text>
            </Pressable>
            <Pressable
              accessibilityRole='button'
              accessibilityLabel='Elegir de la galería'
              onPress={() => {
                void elegirDeGaleria();
              }}
              style={({ pressed }) => [
                estilos.botonSecundario,
                { borderColor: colores.acento, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={{ color: colores.acento, fontWeight: '600' }}>Galería</Text>
            </Pressable>
            {fotoUri ? (
              <Pressable
                accessibilityRole='button'
                accessibilityLabel='Quitar foto'
                onPress={() => {
                  setFotoUri(null);
                  setFotoMime(null);
                }}
                style={({ pressed }) => [
                  estilos.botonSecundario,
                  { borderColor: colores.error, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Text style={{ color: colores.error, fontWeight: '600' }}>Quitar foto</Text>
              </Pressable>
            ) : null}
          </View>

          {errorAccion ? (
            <Text accessibilityRole='alert' style={{ color: colores.error }}>
              {errorAccion}
            </Text>
          ) : null}
          {mensaje ? (
            <Text accessibilityLiveRegion='polite' style={{ color: colores.texto }}>
              {mensaje}
            </Text>
          ) : null}

          <Pressable
            accessibilityRole='button'
            accessibilityLabel='Enviar reporte'
            accessibilityState={{ disabled: enviando }}
            disabled={enviando}
            onPress={handleSubmit(enviar)}
            style={({ pressed }) => [
              estilos.boton,
              { backgroundColor: colores.acento, opacity: pressed || enviando ? 0.7 : 1 },
            ]}
          >
            {enviando ? (
              <ActivityIndicator color={colores.acentoTexto} />
            ) : (
              <Text style={[estilos.textoBoton, { color: colores.acentoTexto }]}>Enviar reporte</Text>
            )}
          </Pressable>

          <Text style={[estilos.etiqueta, { color: colores.texto }]}>Pendientes en este teléfono</Text>
          {pendientes.length === 0 ? (
            <Text style={{ color: colores.textoSecundario }}>No hay reportes esperando conexión.</Text>
          ) : (
            pendientes.map((item) => (
              <Text key={item.id} style={{ color: colores.textoSecundario }}>
                {item.id}: {ETIQUETA_MOTIVO[item.motivo]}
                {item.lastErrorCodigo ? ` (${item.lastErrorCodigo})` : ' — se manda al reconectar'}
              </Text>
            ))
          )}

          <Pressable
            accessibilityRole='button'
            accessibilityLabel='Volver a la parada'
            onPress={() => router.back()}
            style={({ pressed }) => [{ paddingVertical: 12, opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={{ color: colores.acento }}>Volver a la parada</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1 },
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  scroll: { padding: 16, gap: 12 },
  texto: { fontSize: 15 },
  etiqueta: { fontSize: 16, fontWeight: '700', marginTop: 8 },
  filaWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 8 },
  input: { minHeight: 80, borderWidth: 1, borderRadius: 8, padding: 12, textAlignVertical: 'top' },
  preview: { width: '100%', height: 180, borderRadius: 8 },
  boton: { minHeight: 48, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  botonSecundario: {
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  textoBoton: { fontWeight: '700', fontSize: 16 },
  barraCamara: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: '#000',
  },
  botonCamara: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 16 },
  textoCamara: { color: '#fff', fontWeight: '700', fontSize: 16 },
});

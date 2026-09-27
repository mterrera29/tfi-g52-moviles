import { zodResolver } from '@hookform/resolvers/zod';
import { Link, Stack, router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSesion } from '@/contextos/sesion';
import { useTema } from '@/contextos/tema';
import { esquemaLogin, type DatosLogin } from '@/esquemas/auth';

export default function LoginScreen() {
  const { colores } = useTema();
  const { iniciarSesion } = useSesion();
  const [enviando, setEnviando] = useState(false);
  const [errorServicio, setErrorServicio] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<DatosLogin>({
    resolver: zodResolver(esquemaLogin),
    defaultValues: { email: '', clave: '' },
  });

  const enviar = async (datos: DatosLogin) => {
    setEnviando(true);
    setErrorServicio(null);

    const error = await iniciarSesion(datos);

    setEnviando(false);

    if (error) {
      setErrorServicio(error.mensaje);
      return;
    }

    router.replace('/lineas');
  };

  return (
    <SafeAreaView
      style={[estilos.contenedor, { backgroundColor: colores.fondo }]}
      edges={['bottom']}
    >
      <Stack.Screen options={{ title: 'Iniciar sesión' }} />

      <KeyboardAvoidingView
        style={estilos.contenedor}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={estilos.formulario}>
          <Text style={[estilos.titulo, { color: colores.texto }]}>
            Transporte Paraná
          </Text>
          <Text style={[estilos.ayuda, { color: colores.textoSecundario }]}>
            Prueba: matias@ejemplo.com / 12345678
          </Text>

          <Text style={[estilos.etiqueta, { color: colores.texto }]}>Email</Text>
          <Controller
            name='email'
            control={control}
            render={({ field: { value, onChange, onBlur } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder='tu@email.com'
                placeholderTextColor={colores.textoSecundario}
                keyboardType='email-address'
                autoCapitalize='none'
                autoComplete='email'
                accessibilityLabel='Email'
                style={[
                  estilos.campo,
                  {
                    borderColor: errors.email ? colores.error : colores.borde,
                    backgroundColor: colores.fondoSecundario,
                    color: colores.texto,
                  },
                ]}
              />
            )}
          />
          {errors.email && (
            <Text style={[estilos.errorCampo, { color: colores.error }]}>
              {errors.email.message}
            </Text>
          )}

          <Text style={[estilos.etiqueta, { color: colores.texto }]}>
            Contraseña
          </Text>
          <Controller
            name='clave'
            control={control}
            render={({ field: { value, onChange, onBlur } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder='Mínimo 8 caracteres'
                placeholderTextColor={colores.textoSecundario}
                secureTextEntry
                autoCapitalize='none'
                autoComplete='password'
                accessibilityLabel='Contraseña'
                style={[
                  estilos.campo,
                  {
                    borderColor: errors.clave ? colores.error : colores.borde,
                    backgroundColor: colores.fondoSecundario,
                    color: colores.texto,
                  },
                ]}
              />
            )}
          />
          {errors.clave && (
            <Text style={[estilos.errorCampo, { color: colores.error }]}>
              {errors.clave.message}
            </Text>
          )}

          {errorServicio && (
            <Text
              style={[estilos.errorServicio, { color: colores.error }]}
              accessibilityRole='alert'
            >
              {errorServicio}
            </Text>
          )}

          <Pressable
            onPress={handleSubmit(enviar)}
            disabled={enviando}
            accessibilityRole='button'
            accessibilityLabel='Ingresar'
            style={({ pressed }) => [
              estilos.boton,
              {
                backgroundColor: colores.acento,
                opacity: pressed || enviando ? 0.85 : 1,
              },
            ]}
          >
            {enviando ? (
              <ActivityIndicator color={colores.acentoTexto} />
            ) : (
              <Text style={[estilos.botonTexto, { color: colores.acentoTexto }]}>
                Ingresar
              </Text>
            )}
          </Pressable>

          <Link href='/registro' asChild>
            <Pressable accessibilityRole='button' accessibilityLabel='Crear cuenta'>
              <Text style={[estilos.enlace, { color: colores.acento }]}>
                Crear cuenta
              </Text>
            </Pressable>
          </Link>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
  },
  formulario: {
    flex: 1,
    padding: 20,
    gap: 8,
    justifyContent: 'center',
  },
  titulo: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  ayuda: {
    fontSize: 14,
    marginBottom: 16,
  },
  etiqueta: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 8,
  },
  campo: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  errorCampo: {
    fontSize: 13,
  },
  errorServicio: {
    fontSize: 15,
    marginTop: 8,
  },
  boton: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  botonTexto: {
    fontSize: 16,
    fontWeight: '700',
  },
  enlace: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

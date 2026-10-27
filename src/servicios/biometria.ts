import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

export async function biometriaDisponible(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const hayLector = await LocalAuthentication.hasHardwareAsync();
  const hayHuellas = await LocalAuthentication.isEnrolledAsync();
  return hayLector && hayHuellas;
}

export async function pedirBiometria(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const resultado = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Confirmá tu identidad',
    cancelLabel: 'Cancelar',
  });
  return resultado.success;
}

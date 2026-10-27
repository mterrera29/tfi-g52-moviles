import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { CLAVES } from '@/servicios/claves';

// SecureStore no está disponible en web: allí la sesión queda sólo en memoria.
export async function guardarToken(token: string): Promise<void> {
  if (Platform.OS !== 'web') await SecureStore.setItemAsync(CLAVES.token, token);
}

export async function leerToken(): Promise<string | null> {
  return Platform.OS === 'web' ? null : SecureStore.getItemAsync(CLAVES.token);
}

export async function borrarToken(): Promise<void> {
  if (Platform.OS !== 'web') await SecureStore.deleteItemAsync(CLAVES.token);
}

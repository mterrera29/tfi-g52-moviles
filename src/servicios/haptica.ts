import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import type { ResultadoIntentoReporte } from '@/lib/colaReportes';

export async function confirmarHaptica(resultado: ResultadoIntentoReporte): Promise<void> {
  try {
    if (Platform.OS === 'web') return;
    if (Platform.OS === 'android') {
      if (resultado === 'enviado') {
        await Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Confirm);
        return;
      }
      if (resultado === 'rechazado') {
        await Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Reject);
        return;
      }
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    const tipo =
      resultado === 'enviado'
        ? Haptics.NotificationFeedbackType.Success
        : resultado === 'rechazado'
          ? Haptics.NotificationFeedbackType.Error
          : Haptics.NotificationFeedbackType.Warning;
    await Haptics.notificationAsync(tipo);
  } catch {
    // Sin motor háptico el texto de la pantalla sigue siendo la confirmación.
  }
}

import { useWindowDimensions } from 'react-native';

/**
 * Breakpoints alineados con U3 (diseño responsivo):
 * teléfono → 1 columna, pantalla media → 2, tablet → 3.
 */
export function useColumnasLista() {
  const { width } = useWindowDimensions();

  const columnas = width >= 768 ? 3 : width >= 576 ? 2 : 1;

  return { width, columnas };
}

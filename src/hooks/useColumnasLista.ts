import { useState } from 'react';
import { LayoutChangeEvent } from 'react-native';

export function useColumnasLista() {
  const [ancho, setAncho] = useState(0);

  const columnas = ancho >= 900 ? 3 : ancho >= 768 ? 2 : 1;

  const onLayout = (evento: LayoutChangeEvent) => {
    setAncho(evento.nativeEvent.layout.width);
  };

  return { ancho, columnas, onLayout };
}

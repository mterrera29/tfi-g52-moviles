import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

export function useAhoraCadaMinuto() {
  const [ahora, setAhora] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => {
      setAhora(new Date());
    }, 60_000);

    const sub = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') {
        setAhora(new Date());
      }
    });

    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, []);

  return ahora;
}

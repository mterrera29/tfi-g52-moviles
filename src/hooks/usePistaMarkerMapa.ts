import { useEffect, useState } from 'react';

// En Android el marker custom queda invisible si tracksViewChanges arranca en false,
// y se come el rendimiento si queda siempre en true. Al cambiar el aspecto (tema)
// hay que volver a pintar un momento.
export function usePistaMarkerMapa(clave: string | number = 'mapa', ms = 600): boolean {
  const [seguir, setSeguir] = useState(true);

  useEffect(() => {
    setSeguir(true);
    const id = setTimeout(() => setSeguir(false), ms);
    return () => clearTimeout(id);
  }, [clave, ms]);

  return seguir;
}

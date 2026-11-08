import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

import { EstadoError } from '@/componentes/EstadoError';
import { useTema } from '@/contextos/tema';

const MENSAJE_ERROR_VIDEO = 'No se pudo reproducir el video. Intentá de nuevo.';

export function VideoAviso({ uri, etiqueta }: { uri: string; etiqueta: string }) {
  const { colores } = useTema();
  const montado = useRef(true);
  const player = useVideoPlayer({ uri }, (instancia) => {
    instancia.loop = false;
  });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    montado.current = true;
    const sub = player.addListener('statusChange', ({ status, error: errorPlayer }) => {
      if (!montado.current) return;
      setCargando(status === 'loading');
      setError(errorPlayer ? MENSAJE_ERROR_VIDEO : null);
    });
    return () => {
      montado.current = false;
      sub.remove();
    };
  }, [player]);

  return (
    <View style={estilos.contenedor}>
      <VideoView
        style={[estilos.video, { backgroundColor: colores.fondoSecundario }]}
        player={player}
        nativeControls
        contentFit='contain'
        fullscreenOptions={{ enable: true }}
        accessibilityLabel={etiqueta}
      />
      {cargando ? (
        <View style={estilos.estado} accessibilityLiveRegion='polite'>
          <ActivityIndicator color={colores.acento} accessibilityLabel='Cargando video' />
          <Text style={{ color: colores.textoSecundario }}>Cargando video…</Text>
        </View>
      ) : null}
      {error ? (
        <EstadoError
          mensaje={error}
          onReintentar={() => {
            setError(null);
            setCargando(true);
            void player.replaceAsync({ uri }).catch(() => {
              if (!montado.current) return;
              setCargando(false);
              setError(MENSAJE_ERROR_VIDEO);
            });
          }}
        />
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    gap: 8,
  },
  video: {
    width: '100%',
    height: 220,
    borderRadius: 8,
  },
  estado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});

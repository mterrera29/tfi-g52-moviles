import { useVideoPlayer, VideoView } from 'expo-video';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTema } from '@/contextos/tema';

export function VideoAviso({ url }: { url: string }) {
  const { colores } = useTema();
  const [isPlaying, setIsPlaying] = useState(false);
  const player = useVideoPlayer(url, (p) => {
    p.loop = false;
  });

  return (
    <View style={[estilos.contenedor, { borderColor: colores.borde }]}>
      <VideoView
        style={estilos.video}
        player={player}
        contentFit='contain'
        nativeControls
      />
      <Pressable
        accessibilityRole='button'
        accessibilityLabel={isPlaying ? 'Pausar video' : 'Reproducir video'}
        onPress={() => {
          if (isPlaying) {
            player.pause();
            setIsPlaying(false);
          } else {
            player.play();
            setIsPlaying(true);
          }
        }}
        style={({ pressed }) => [estilos.boton, { backgroundColor: colores.acento, opacity: pressed ? 0.7 : 1 }]}
      >
        <Text style={[estilos.botonTexto, { color: colores.acentoTexto }]}>
          {isPlaying ? 'Pausar' : 'Reproducir'}
        </Text>
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { borderRadius: 12, borderWidth: 1, overflow: 'hidden', gap: 8 },
  video: { width: '100%', height: 200, backgroundColor: '#000' },
  boton: { minHeight: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 8, margin: 8 },
  botonTexto: { fontSize: 15, fontWeight: '600' },
});

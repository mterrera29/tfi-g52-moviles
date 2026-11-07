import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSesion } from '@/contextos/sesion';
import {
  agregarLineaFavorita,
  agregarParadaFavorita,
  obtenerUsuario,
  quitarLineaFavorita,
  quitarParadaFavorita,
} from '@/servicios/usuario';
import type { RespuestaError, RespuestaUno } from '@/tipos/api';
import type { Usuario } from '@/tipos/usuario';

type CambioFavorito = {
  id: string;
  eraFavorito: boolean;
};

export function useFavoritos() {
  const { sesion } = useSesion();
  const queryClient = useQueryClient();
  const queryKey = ['yo'];
  const consulta = useQuery<RespuestaUno<Usuario>, RespuestaError>({
    queryKey,
    queryFn: async () => {
      const respuesta = await obtenerUsuario();
      if ('error' in respuesta) throw respuesta;
      return respuesta;
    },
    enabled: !!sesion,
  });

  const mutacionLinea = useMutation<void, RespuestaError, CambioFavorito, { previo: RespuestaUno<Usuario> | undefined }>({
    mutationFn: async ({ id, eraFavorito }) => {
      if (eraFavorito) await quitarLineaFavorita(id);
      else await agregarLineaFavorita(id);
    },
    onMutate: async ({ id, eraFavorito }) => {
      await queryClient.cancelQueries({ queryKey });
      const previo = queryClient.getQueryData<RespuestaUno<Usuario>>(queryKey);
      queryClient.setQueryData<RespuestaUno<Usuario>>(queryKey, (actual) => actual && ({
        ...actual,
        datos: {
          ...actual.datos,
          lineasFavoritas: eraFavorito
            ? actual.datos.lineasFavoritas.filter((favorito) => favorito !== id)
            : [...actual.datos.lineasFavoritas, id],
        },
      }));
      return { previo };
    },
    onError: (_error: RespuestaError, _cambio, contexto) => {
      queryClient.setQueryData(queryKey, contexto?.previo);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const mutacionParada = useMutation<void, RespuestaError, CambioFavorito, { previo: RespuestaUno<Usuario> | undefined }>({
    mutationFn: async ({ id, eraFavorito }) => {
      if (eraFavorito) await quitarParadaFavorita(id);
      else await agregarParadaFavorita(id);
    },
    onMutate: async ({ id, eraFavorito }) => {
      await queryClient.cancelQueries({ queryKey });
      const previo = queryClient.getQueryData<RespuestaUno<Usuario>>(queryKey);
      queryClient.setQueryData<RespuestaUno<Usuario>>(queryKey, (actual) => actual && ({
        ...actual,
        datos: {
          ...actual.datos,
          paradasFavoritas: eraFavorito
            ? actual.datos.paradasFavoritas.filter((favorito) => favorito !== id)
            : [...actual.datos.paradasFavoritas, id],
        },
      }));
      return { previo };
    },
    onError: (_error: RespuestaError, _cambio, contexto) => {
      queryClient.setQueryData(queryKey, contexto?.previo);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const usuario = consulta.data?.datos;
  return {
    ...consulta,
    usuario,
    actualizando: mutacionLinea.isPending || mutacionParada.isPending,
    lineasFavoritas: usuario?.lineasFavoritas ?? [],
    paradasFavoritas: usuario?.paradasFavoritas ?? [],
    alternarLineaFavorita: (id: string) => mutacionLinea.mutate({
      id,
      eraFavorito: usuario?.lineasFavoritas.includes(id) ?? false,
    }),
    alternarParadaFavorita: (id: string) => mutacionParada.mutate({
      id,
      eraFavorito: usuario?.paradasFavoritas.includes(id) ?? false,
    }),
    errorLinea: mutacionLinea.error,
    errorParada: mutacionParada.error,
  };
}

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useSesion } from '@/contextos/sesion';
import { useTema } from '@/contextos/tema';
import { actualizarPerfil } from '@/servicios/usuario';
import type { RespuestaError, RespuestaUno } from '@/tipos/api';
import type { Tema, Usuario } from '@/tipos/usuario';

export function useCambioTema() {
  const { preferencia, setPreferencia } = useTema();
  const { sesion, actualizarUsuarioEnMemoria } = useSesion();
  const queryClient = useQueryClient();
  const queryKey = ['yo'];

  const mutacion = useMutation<
    RespuestaUno<Usuario>,
    RespuestaError,
    Tema,
    { anterior: Tema; previoYo: RespuestaUno<Usuario> | undefined }
  >({
    mutationFn: async (tema) => actualizarPerfil({ tema }),
    onMutate: async (tema) => {
      const anterior = preferencia;
      setPreferencia(tema);
      await queryClient.cancelQueries({ queryKey });
      const previoYo = queryClient.getQueryData<RespuestaUno<Usuario>>(queryKey);
      queryClient.setQueryData<RespuestaUno<Usuario>>(queryKey, (actual) =>
        actual
          ? { ...actual, datos: { ...actual.datos, tema } }
          : actual,
      );
      return { anterior, previoYo };
    },
    onSuccess: (respuesta) => {
      actualizarUsuarioEnMemoria({ tema: respuesta.datos.tema });
      queryClient.setQueryData(queryKey, respuesta);
    },
    onError: (_error, _tema, contexto) => {
      if (contexto?.anterior) setPreferencia(contexto.anterior);
      queryClient.setQueryData(queryKey, contexto?.previoYo);
    },
  });

  const elegirTema = useCallback(
    (tema: Tema) => {
      if (tema === preferencia) return;
      if (!sesion) {
        setPreferencia(tema);
        return;
      }
      mutacion.mutate(tema);
    },
    [mutacion, preferencia, sesion, setPreferencia],
  );

  return {
    preferencia,
    elegirTema,
    errorTema: mutacion.error,
    actualizandoTema: mutacion.isPending,
  };
}

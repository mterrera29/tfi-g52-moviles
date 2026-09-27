import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  cerrarSesion as cerrarSesionServicio,
  iniciarSesion as iniciarSesionServicio,
  registrar as registrarServicio,
  type Sesion,
} from '@/servicios/auth';
import type { DatosLogin, DatosRegistro } from '@/esquemas/auth';
import type { RespuestaError } from '@/tipos/linea';

type SesionContextoValor = {
  sesion: Sesion | null;
  iniciarSesion: (
    datos: DatosLogin,
  ) => Promise<RespuestaError['error'] | null>;
  registrar: (datos: DatosRegistro) => Promise<RespuestaError['error'] | null>;
  cerrarSesion: () => Promise<void>;
};

const SesionContexto = createContext<SesionContextoValor | null>(null);

export function SesionProvider({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Sesion | null>(null);

  const iniciarSesion = useCallback(async (datos: DatosLogin) => {
    const respuesta = await iniciarSesionServicio(datos);

    if ('error' in respuesta) {
      return respuesta.error;
    }

    setSesion(respuesta.datos);
    return null;
  }, []);

  const registrar = useCallback(async (datos: DatosRegistro) => {
    const respuesta = await registrarServicio(datos);

    if ('error' in respuesta) {
      return respuesta.error;
    }

    setSesion(respuesta.datos);
    return null;
  }, []);

  const cerrarSesion = useCallback(async () => {
    await cerrarSesionServicio();
    setSesion(null);
  }, []);

  const valor = useMemo(
    () => ({
      sesion,
      iniciarSesion,
      registrar,
      cerrarSesion,
    }),
    [sesion, iniciarSesion, registrar, cerrarSesion],
  );

  return (
    <SesionContexto.Provider value={valor}>{children}</SesionContexto.Provider>
  );
}

export function useSesion(): SesionContextoValor {
  const contexto = useContext(SesionContexto);

  if (!contexto) {
    throw new Error('useSesion debe usarse dentro de SesionProvider');
  }

  return contexto;
}

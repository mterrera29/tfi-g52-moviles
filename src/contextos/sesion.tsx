import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import {
  cerrarSesion as cerrarSesionServicio,
  iniciarSesion as iniciarSesionServicio,
  obtenerSesion,
  registrar as registrarServicio,
} from '@/servicios/auth';
import { biometriaDisponible, pedirBiometria } from '@/servicios/biometria';
import { establecerAlCerrarSesion, establecerToken } from '@/servicios/cliente';
import { queryClient } from '@/servicios/queryClient';
import { borrarToken, leerToken } from '@/servicios/token';
import type { DatosLogin, DatosRegistro } from '@/esquemas/auth';
import type { RespuestaError, Sesion } from '@/tipos/api';

type SesionContextoValor = {
  sesion: Sesion | null;
  restaurando: boolean;
  bloqueada: boolean;
  reintentarBiometria: () => Promise<void>;
  ingresarConContrasena: () => Promise<void>;
  errorCierre: string | null;
  iniciarSesion: (datos: DatosLogin) => Promise<RespuestaError['error'] | null>;
  registrar: (datos: DatosRegistro) => Promise<RespuestaError['error'] | null>;
  cerrarSesion: () => Promise<void>;
};

const SesionContexto = createContext<SesionContextoValor | null>(null);

async function restaurarSesionGuardada() {
  try {
    const token = await leerToken();
    if (token && (await biometriaDisponible()) && !(await pedirBiometria())) {
      return 'bloqueada' as const;
    }
  } catch {
    return 'bloqueada' as const;
  }
  return obtenerSesion();
}

export function SesionProvider({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [restaurando, setRestaurando] = useState(true);
  const [bloqueada, setBloqueada] = useState(false);
  const [errorCierre, setErrorCierre] = useState<string | null>(null);
  const sesionActual = useRef<Sesion | null>(null);

  const actualizarSesion = useCallback((nuevaSesion: Sesion | null) => {
    sesionActual.current = nuevaSesion;
    establecerToken(nuevaSesion?.token ?? null);
    setSesion(nuevaSesion);
  }, []);

  const cerrarSesion = useCallback(async () => {
    // Se limpia memoria y caché incluso si falla el llavero del dispositivo.
    actualizarSesion(null);
    queryClient.clear();
    const respuesta = await cerrarSesionServicio();
    setErrorCierre(respuesta
      ? 'No pudimos borrar el token del dispositivo. Reintentá antes de cerrar la app: al abrirla podría restaurarse la sesión.'
      : null);
  }, [actualizarSesion]);

  useEffect(() => {
    let vigente = true;
    establecerAlCerrarSesion(async () => {
      // Credenciales incorrectas sin sesión no disparan este cierre.
      if (sesionActual.current) await cerrarSesion();
    });

    async function restaurar() {
      const respuesta = await restaurarSesionGuardada();
      if (!vigente) return;
      if (respuesta === 'bloqueada') {
        setBloqueada(true);
        setRestaurando(false);
        return;
      }
      actualizarSesion(respuesta && !('error' in respuesta) ? respuesta : null);
      setRestaurando(false);
    }
    void restaurar();

    return () => {
      vigente = false;
      establecerAlCerrarSesion(null);
    };
  }, [actualizarSesion, cerrarSesion]);

  const reintentarBiometria = useCallback(async () => {
    setRestaurando(true);
    const respuesta = await restaurarSesionGuardada();
    setBloqueada(respuesta === 'bloqueada');
    if (respuesta !== 'bloqueada') {
      actualizarSesion(respuesta && !('error' in respuesta) ? respuesta : null);
    }
    setRestaurando(false);
  }, [actualizarSesion]);

  const ingresarConContrasena = useCallback(async () => {
    await borrarToken();
    establecerToken(null);
    setBloqueada(false);
  }, []);

  const iniciarSesion = useCallback(async (datos: DatosLogin) => {
    const respuesta = await iniciarSesionServicio(datos);
    if ('error' in respuesta) return respuesta.error;
    actualizarSesion(respuesta);
    setErrorCierre(null);
    return null;
  }, [actualizarSesion]);

  const registrar = useCallback(async (datos: DatosRegistro) => {
    const respuesta = await registrarServicio(datos);
    if ('error' in respuesta) return respuesta.error;
    actualizarSesion(respuesta);
    setErrorCierre(null);
    return null;
  }, [actualizarSesion]);

  const valor = useMemo(
    () => ({
      sesion,
      restaurando,
      bloqueada,
      reintentarBiometria,
      ingresarConContrasena,
      errorCierre,
      iniciarSesion,
      registrar,
      cerrarSesion,
    }),
    [sesion, restaurando, bloqueada, reintentarBiometria, ingresarConContrasena, errorCierre, iniciarSesion, registrar, cerrarSesion],
  );

  return <SesionContexto.Provider value={valor}>{children}</SesionContexto.Provider>;
}

export function useSesion(): SesionContextoValor {
  const contexto = useContext(SesionContexto);
  if (!contexto) throw new Error('useSesion debe usarse dentro de SesionProvider');
  return contexto;
}

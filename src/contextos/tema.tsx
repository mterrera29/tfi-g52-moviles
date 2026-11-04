import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme, type ColorSchemeName } from 'react-native';

import type { Tema as PreferenciaTema } from '@/tipos/usuario';
import { leerTexto, guardarTexto } from '@/lib/almacenClaveValor';
import { CLAVES } from '@/servicios/claves';
import { paletas, type ColoresTema, type ModoTema } from '@/temas/paleta';

type TemaContextoValor = {
  modo: ModoTema;
  colores: ColoresTema;
  preferencia: PreferenciaTema;
  setPreferencia: (preferencia: PreferenciaTema) => void;
};

const TemaContexto = createContext<TemaContextoValor | null>(null);

type TemaProviderProps = {
  children: ReactNode;
  preferenciaInicial?: PreferenciaTema;
};

function resolverModo(
  preferencia: PreferenciaTema,
  esquemaSistema: ColorSchemeName,
): ModoTema {
  if (preferencia === 'oscuro') {
    return 'oscuro';
  }

  if (preferencia === 'claro') {
    return 'claro';
  }

  return esquemaSistema === 'dark' ? 'oscuro' : 'claro';
}

function leerPreferenciaInicial(fallback: PreferenciaTema): PreferenciaTema {
  const guardada = leerTexto(CLAVES.tema);
  if (guardada === 'claro' || guardada === 'oscuro' || guardada === 'sistema') {
    return guardada;
  }
  return fallback;
}

export function TemaProvider({
  children,
  preferenciaInicial = 'sistema',
}: TemaProviderProps) {
  const esquemaSistema = useColorScheme();
  const [preferencia, setPreferenciaState] = useState<PreferenciaTema>(() =>
    leerPreferenciaInicial(preferenciaInicial),
  );

  const modo = useMemo(
    () => resolverModo(preferencia, esquemaSistema),
    [preferencia, esquemaSistema],
  );

  const colores = paletas[modo];

  const setPreferencia = useCallback((nueva: PreferenciaTema) => {
    setPreferenciaState(nueva);
    guardarTexto(CLAVES.tema, nueva);
  }, []);

  const valor = useMemo(
    () => ({
      modo,
      colores,
      preferencia,
      setPreferencia,
    }),
    [modo, colores, preferencia, setPreferencia],
  );

  return (
    <TemaContexto.Provider value={valor}>{children}</TemaContexto.Provider>
  );
}

export function useTema(): TemaContextoValor {
  const contexto = useContext(TemaContexto);

  if (!contexto) {
    throw new Error('useTema debe usarse dentro de TemaProvider');
  }

  return contexto;
}

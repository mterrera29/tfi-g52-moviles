import type { ColorSchemeName } from 'react-native';

import type { Tema } from '@/tipos/usuario';
import type { ModoTema } from '@/temas/paleta';

export function resolverModo(preferencia: Tema, esquemaSistema: ColorSchemeName): ModoTema {
  if (preferencia === 'oscuro') return 'oscuro';
  if (preferencia === 'claro') return 'claro';
  return esquemaSistema === 'dark' ? 'oscuro' : 'claro';
}

export function esTemaValido(valor: string | null | undefined): valor is Tema {
  return valor === 'claro' || valor === 'oscuro' || valor === 'sistema';
}

// El tema del servidor se aplica al hidratar UNA sesión, no cada vez que
// cambia la preferencia local. Si se copiaba siempre que diferían, el
// usuario logueado no podía pasar de claro a oscuro: el effect lo revertía.
export function debeAplicarTemaDeSesion(opciones: {
  idUsuario: string | null | undefined;
  idYaAplicado: string | null;
  temaServidor: Tema | null | undefined;
}): boolean {
  const { idUsuario, idYaAplicado, temaServidor } = opciones;
  if (!idUsuario || !esTemaValido(temaServidor ?? null)) return false;
  return idYaAplicado !== idUsuario;
}

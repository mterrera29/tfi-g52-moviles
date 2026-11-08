export type SuscripcionRemovible = { remove: () => void };

export function sesionVigente(cancelado: boolean, sesion: number, sesionActual: number): boolean {
  return !cancelado && sesion === sesionActual;
}

export function adoptarSuscripcionSiVigente(
  sub: SuscripcionRemovible,
  vigente: boolean,
): SuscripcionRemovible | null {
  if (!vigente) {
    sub.remove();
    return null;
  }
  return sub;
}

export async function resolverWatchSiVigente(
  pendiente: Promise<SuscripcionRemovible>,
  sigueVigente: () => boolean,
): Promise<{ sub: SuscripcionRemovible | null; fallo: unknown | null }> {
  try {
    const obtenida = await pendiente;
    if (!sigueVigente()) {
      obtenida.remove();
      return { sub: null, fallo: null };
    }
    return { sub: obtenida, fallo: null };
  } catch (fallo) {
    return { sub: null, fallo };
  }
}

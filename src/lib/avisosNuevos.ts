import { avisoVigente } from '@/lib/avisoVigente';
import type { Aviso } from '@/tipos/aviso';

export type ResultadoAvisosNuevos =
  | { accion: 'sembrar'; ids: string[] }
  | { accion: 'notificar'; avisos: Aviso[]; ids: string[] }
  | { accion: 'nada'; ids: string[] };

export function idsDeAvisos(avisos: Aviso[]): string[] {
  return [...new Set(avisos.map((aviso) => aviso.id))];
}

export function avisosPertinentesFavoritos(
  avisos: Aviso[],
  lineasFavoritas: string[],
  ahora: Date,
): Aviso[] {
  if (lineasFavoritas.length === 0) return [];
  return avisos.filter(
    (aviso) =>
      avisoVigente(aviso, ahora) &&
      aviso.lineaIds.some((lineaId) => lineasFavoritas.includes(lineaId)),
  );
}

export function resolverAvisosNuevos(opciones: {
  avisos: Aviso[];
  lineasFavoritas: string[];
  avisosActivos: boolean;
  idsVistos: string[] | null;
  ahora?: Date;
}): ResultadoAvisosNuevos {
  const ahora = opciones.ahora ?? new Date();
  const pertinentes = avisosPertinentesFavoritos(opciones.avisos, opciones.lineasFavoritas, ahora);
  const idsActuales = idsDeAvisos(pertinentes);

  if (!opciones.avisosActivos) {
    return { accion: 'nada', ids: opciones.idsVistos ?? idsActuales };
  }

  if (opciones.idsVistos === null) {
    return { accion: 'sembrar', ids: idsActuales };
  }

  const vistos = new Set(opciones.idsVistos);
  const nuevos = pertinentes.filter((aviso) => !vistos.has(aviso.id));
  const ids = [...new Set([...opciones.idsVistos, ...idsActuales])];
  if (nuevos.length === 0) return { accion: 'nada', ids };
  return { accion: 'notificar', avisos: nuevos, ids };
}

export function rutaNotificacionValida(ruta: unknown): ruta is string {
  if (typeof ruta !== 'string') return false;
  return (
    /^\/parada\/[A-Za-z0-9_-]+$/.test(ruta) ||
    /^\/aviso\/[A-Za-z0-9_-]+$/.test(ruta) ||
    /^\/linea\/[A-Za-z0-9_-]+$/.test(ruta)
  );
}

export function destinoDesdeRuta(
  ruta: string,
): { pathname: '/parada/[id]' | '/aviso/[id]' | '/linea/[id]'; params: { id: string } } | null {
  if (!rutaNotificacionValida(ruta)) return null;
  const [, tipo, id] = ruta.split('/');
  if (tipo === 'parada') return { pathname: '/parada/[id]', params: { id } };
  if (tipo === 'aviso') return { pathname: '/aviso/[id]', params: { id } };
  if (tipo === 'linea') return { pathname: '/linea/[id]', params: { id } };
  return null;
}

import { distanciaEntre } from '@/lib/rumboParada';
import type { Horario } from '@/tipos/horario';
import type { Coordenadas, Sentido } from '@/tipos/linea';

export type ResumenHorariosSentido = {
  primero: string;
  ultimo: string;
  /** Minutos típicos entre servicios (mediana); null si hay menos de dos. */
  cadaMinutos: number | null;
  servicios: number;
};

function aMinutos(hora: string): number | null {
  const m = /^(\d{1,2}):(\d{2})/.exec(hora.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h >= 0 && h < 48 && min < 60 ? h * 60 + min : null;
}

function hhmm(hora: string): string {
  const minutos = aMinutos(hora);
  if (minutos === null) return hora;
  return `${String(Math.floor(minutos / 60) % 24).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;
}

export function resumirHorarios(
  horarios: Horario[],
  lineaId: string,
  sentido: Sentido,
): ResumenHorariosSentido | null {
  const validos = horarios
    .filter((h) => h.lineaId === lineaId && h.sentido === sentido)
    .map((h) => ({ hora: h.hora, minutos: aMinutos(h.hora) }))
    .filter((h): h is { hora: string; minutos: number } => h.minutos !== null)
    .sort((a, b) => a.minutos - b.minutos);
  if (validos.length === 0) return null;

  const saltos: number[] = [];
  for (let i = 1; i < validos.length; i += 1) {
    const salto = validos[i].minutos - validos[i - 1].minutos;
    if (salto > 0) saltos.push(salto);
  }
  saltos.sort((a, b) => a - b);
  const cadaMinutos = saltos.length ? saltos[Math.floor(saltos.length / 2)] : null;

  return {
    primero: hhmm(validos[0].hora),
    ultimo: hhmm(validos[validos.length - 1].hora),
    cadaMinutos,
    servicios: validos.length,
  };
}

/** Largo aproximado del trazado en kilómetros; null si no hay trazado usable. */
export function largoTrazadoKm(trazado: Coordenadas[]): number | null {
  let metros = 0;
  for (let i = 1; i < trazado.length; i += 1) {
    metros += distanciaEntre(trazado[i - 1], trazado[i]) ?? 0;
  }
  return metros > 0 ? metros / 1000 : null;
}

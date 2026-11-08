export const ZONA_PARANA = 'America/Argentina/Buenos_Aires';

export type PartesParana = {
  ymd: string;
  hora: number;
  minuto: number;
  segundo: number;
  weekday: string;
};

function pad2(valor: number): string {
  return String(valor).padStart(2, '0');
}

export function parsearHoraTabla(hora: string): { hora: number; minuto: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hora.trim());
  if (!match) return null;
  const horaNum = Number(match[1]);
  const minutoNum = Number(match[2]);
  if (
    !Number.isInteger(horaNum) ||
    !Number.isInteger(minutoNum) ||
    horaNum < 0 ||
    horaNum > 23 ||
    minutoNum < 0 ||
    minutoNum > 59
  ) {
    return null;
  }
  return { hora: horaNum, minuto: minutoNum };
}

export function minutosDesdeMedianoche(hora: string): number | null {
  const partes = parsearHoraTabla(hora);
  if (!partes) return null;
  return partes.hora * 60 + partes.minuto;
}

export function partesParana(fecha: Date): PartesParana {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: ZONA_PARANA,
      weekday: 'short',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(fecha)
      .filter((parte) => parte.type !== 'literal')
      .map((parte) => [parte.type, parte.value]),
  );

  return {
    ymd: `${partes.year}-${partes.month}-${partes.day}`,
    hora: Number(partes.hour),
    minuto: Number(partes.minute),
    segundo: Number(partes.second),
    weekday: (partes.weekday ?? '').replace('.', ''),
  };
}

export function agregarDiasYmd(ymd: string, dias: number): string {
  const [anio, mes, dia] = ymd.split('-').map(Number);
  const utc = new Date(Date.UTC(anio, mes - 1, dia + dias));
  return `${utc.getUTCFullYear()}-${pad2(utc.getUTCMonth() + 1)}-${pad2(utc.getUTCDate())}`;
}

export function instanteParana(ymd: string, hora: string): Date | null {
  const parsed = parsearHoraTabla(hora);
  if (!parsed) return null;
  const [anio, mes, dia] = ymd.split('-').map(Number);
  if (!anio || !mes || !dia) return null;

  const guess = new Date(Date.UTC(anio, mes - 1, dia, parsed.hora + 3, parsed.minuto, 0));
  const actual = partesParana(guess);
  const actualUtc = Date.UTC(
    Number(actual.ymd.slice(0, 4)),
    Number(actual.ymd.slice(5, 7)) - 1,
    Number(actual.ymd.slice(8, 10)),
    actual.hora,
    actual.minuto,
    actual.segundo,
  );
  const deseadoUtc = Date.UTC(anio, mes - 1, dia, parsed.hora, parsed.minuto, 0);
  return new Date(guess.getTime() + (deseadoUtc - actualUtc));
}

export function diaSemanaParana(ymd: string): number {
  const instante = instanteParana(ymd, '12:00');
  if (!instante) return -1;
  const mapa: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return mapa[partesParana(instante).weekday] ?? -1;
}

import type { Feriado } from '@/tipos/api';
import type { TipoDeDia } from '@/tipos/horario';
import { diaSemanaParana, partesParana } from '@/lib/zonaParana';

export function elegirTipoDeDiaYmd(ymd: string, feriados: Feriado[]): TipoDeDia {
  if (feriados.some((feriado) => feriado.fecha === ymd)) {
    return 'feriado';
  }
  const dia = diaSemanaParana(ymd);
  if (dia === 0) return 'domingo';
  if (dia === 6) return 'sabado';
  return 'habil';
}

export function elegirTipoDeDia(fecha: Date, feriados: Feriado[]): TipoDeDia {
  return elegirTipoDeDiaYmd(partesParana(fecha).ymd, feriados);
}

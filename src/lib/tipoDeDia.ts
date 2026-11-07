import type { Feriado } from '@/tipos/api';
import type { TipoDeDia } from '@/tipos/horario';

function fechaLocalIso(fecha: Date): string {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function elegirTipoDeDia(fecha: Date, feriados: Feriado[]): TipoDeDia {
  const clave = fechaLocalIso(fecha);
  if (feriados.some((feriado) => feriado.fecha === clave)) {
    return 'feriado';
  }
  const dia = fecha.getDay();
  if (dia === 0) return 'domingo';
  if (dia === 6) return 'sabado';
  return 'habil';
}

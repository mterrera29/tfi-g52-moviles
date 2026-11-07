import type { Sentido } from '@/tipos/linea';

export type TipoDeDia = 'habil' | 'sabado' | 'domingo' | 'feriado';

export interface Horario {
  id: string;
  lineaId: string;
  paradaId: string;
  sentido: Sentido;
  tipoDeDia: TipoDeDia;
  hora: string;
}

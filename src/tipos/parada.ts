import type { Coordenadas, Sentido } from '@/tipos/linea';

export interface Parada {
  id: string;
  nombre: string;
  coordenadas: Coordenadas;
  lineaIds: string[];
  sentido: Sentido;
  refugio: boolean;
  codigoQr: string | null;
}

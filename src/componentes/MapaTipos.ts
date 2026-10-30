import type { Coordenadas, Recorrido } from '@/tipos/linea';
import type { Parada } from '@/tipos/parada';

export interface PropsMapa {
  coordenadas?: Coordenadas | null;
  paradas?: Parada[];
  recorridos?: Recorrido[];
  color?: string;
  descripcion: string;
}

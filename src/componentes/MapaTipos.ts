import type { Coordenadas, Recorrido } from '@/tipos/linea';
import type { Parada } from '@/tipos/parada';
import type { TrazadoAlternativoMapa } from '@/lib/trazadoAlternativo';

export interface PropsMapa {
  coordenadas?: Coordenadas | null;
  paradas?: Parada[];
  recorridos?: Recorrido[];
  trazadosAlternativos?: TrazadoAlternativoMapa[];
  color?: string;
  colorParada?: string | null;
  colorIda?: string;
  colorVuelta?: string;
  colorDesvio?: string;
  descripcion: string;
  estiloInterfaz?: 'light' | 'dark';
}

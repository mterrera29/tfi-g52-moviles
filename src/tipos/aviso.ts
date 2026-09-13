import type { Coordenadas } from '@/tipos/linea';

export type Gravedad = 'informativo' | 'desvio' | 'suspension';

export interface Aviso {
  id: string;
  titulo: string;
  detalle: string;
  lineaIds: string[];
  desde: string;
  hasta: string | null;
  gravedad: Gravedad;
  trazadoAlternativo: Coordenadas[] | null;
  videoUrl: string | null;
}

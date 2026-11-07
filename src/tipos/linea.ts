export interface Coordenadas {
  latitud: number;
  longitud: number;
}

export type Sentido = 'ida' | 'vuelta';

export interface Recorrido {
  sentido: Sentido;
  destino: string;
  trazado: Coordenadas[];
  paradaIds: string[];
}

export interface Linea {
  id: string;
  numero: string;
  nombre: string;
  color: string;
  empresa: string;
  recorridos: Recorrido[];
  activa: boolean;
}

// TEMPORAL hasta migrar a la API: evitamos cambiar los imports de las pantallas.
export type { RespuestaExito, RespuestaError } from '@/tipos/api';

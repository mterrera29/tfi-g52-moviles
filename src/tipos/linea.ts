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

export interface RespuestaExito<T> {
  datos: T;
  meta: {
    total: number;
    pagina: number;
    porPagina: number;
  };
}

export interface RespuestaError {
  error: {
    codigo: string;
    mensaje: string;
  };
}

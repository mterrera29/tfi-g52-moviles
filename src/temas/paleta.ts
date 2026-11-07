export type ModoTema = 'claro' | 'oscuro';

export interface ColoresTema {
  fondo: string;
  fondoSecundario: string;
  texto: string;
  textoSecundario: string;
  borde: string;
  acento: string;
  acentoTexto: string;
  error: string;
  headerFondo: string;
  headerTexto: string;
  tarjetaAvisoDesvio: string;
  tarjetaAvisoSuspension: string;
  tarjetaAvisoInfo: string;
}

export const paletas: Record<ModoTema, ColoresTema> = {
  claro: {
    fondo: '#FFFFFF',
    fondoSecundario: '#F4F7FA',
    texto: '#1A1A1A',
    textoSecundario: '#5C6670',
    borde: '#D0D7DE',
    acento: '#0B3A5D',
    acentoTexto: '#FFFFFF',
    error: '#B42318',
    headerFondo: '#0B3A5D',
    headerTexto: '#FFFFFF',
    tarjetaAvisoDesvio: '#FFF4E5',
    tarjetaAvisoSuspension: '#FEE4E2',
    tarjetaAvisoInfo: '#E8F4FD',
  },
  oscuro: {
    fondo: '#12191F',
    fondoSecundario: '#1C2630',
    texto: '#E8EDF2',
    textoSecundario: '#9AA8B5',
    borde: '#2D3A47',
    acento: '#7FB3E0',
    acentoTexto: '#12191F',
    error: '#F97066',
    headerFondo: '#0B3A5D',
    headerTexto: '#FFFFFF',
    tarjetaAvisoDesvio: '#3D2E1A',
    tarjetaAvisoSuspension: '#3D2220',
    tarjetaAvisoInfo: '#1A2D3D',
  },
};

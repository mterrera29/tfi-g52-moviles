export type MotivoDemora =
  | 'no_paso'
  | 'paso_lleno'
  | 'demorado'
  | 'unidad_rota'
  | 'calle_cortada';

export interface ReporteDeDemora {
  id: string;
  lineaId: string;
  paradaId: string;
  usuarioId: string;
  motivo: MotivoDemora;
  comentario: string | null;
  fotoUri: string | null;
  confirmaciones: number;
  fechaHora: string;
  sincronizado: boolean;
}

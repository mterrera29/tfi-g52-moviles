import { z } from 'zod';

export const MOTIVOS_DEMORA = [
  'no_paso',
  'paso_lleno',
  'demorado',
  'unidad_rota',
  'calle_cortada',
] as const;

export const esquemaReporte = z.object({
  lineaId: z.string().min(1, { error: 'Elegí una línea' }),
  paradaId: z.string().min(1, { error: 'Falta la parada' }),
  motivo: z.enum(MOTIVOS_DEMORA, { error: 'Elegí un motivo' }),
  comentario: z.string().optional(),
});

export type DatosReporte = z.infer<typeof esquemaReporte>;

export function comentarioReporte(valor: string | null | undefined): string | null {
  const recorte = (valor ?? '').trim();
  return recorte.length === 0 ? null : recorte;
}

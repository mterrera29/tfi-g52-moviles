import { z } from 'zod';

export const esquemaLogin = z.object({
  email: z.email({ error: 'Email inválido' }),
  clave: z.string().min(8, { error: 'Mínimo 8 caracteres' }),
});

export const esquemaRegistro = z.object({
  nombre: z.string().min(2, { error: 'Ingresá tu nombre' }),
  email: z.email({ error: 'Email inválido' }),
  clave: z.string().min(8, { error: 'Mínimo 8 caracteres' }),
});

export type DatosLogin = z.infer<typeof esquemaLogin>;
export type DatosRegistro = z.infer<typeof esquemaRegistro>;

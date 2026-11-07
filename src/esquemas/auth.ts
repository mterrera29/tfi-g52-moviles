import { z } from 'zod';

const email = z.string().trim()
  .max(200, { error: 'Máximo 200 caracteres' })
  .pipe(z.email({ error: 'Email inválido' }));
const clave = z.string()
  .min(8, { error: 'Mínimo 8 caracteres' })
  .max(200, { error: 'Máximo 200 caracteres' });

export const esquemaLogin = z.object({ email, clave });

export const esquemaRegistro = z.object({
  nombre: z.string().trim()
    .min(1, { error: 'Ingresá tu nombre' })
    .max(100, { error: 'Máximo 100 caracteres' }),
  email,
  clave,
});

export type DatosLogin = z.infer<typeof esquemaLogin>;
export type DatosRegistro = z.infer<typeof esquemaRegistro>;

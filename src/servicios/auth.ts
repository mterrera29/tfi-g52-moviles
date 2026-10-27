import { cuentasMock } from '@/mocks/cuentas';
import { usuarioMock } from '@/mocks/usuario';
import type { DatosLogin, DatosRegistro } from '@/esquemas/auth';
import type { RespuestaError, RespuestaExito, Sesion } from '@/tipos/api';
import type { Usuario } from '@/tipos/usuario';

// TEMPORAL hasta migrar a la API: el contexto todavía importa Sesion desde acá.
export type { Sesion } from '@/tipos/api';

const esperar = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));

let sesionActual: Sesion | null = null;

function metaUnidad() {
  return { total: 1, pagina: 1, porPagina: 1 };
}

export async function iniciarSesion(
  datos: DatosLogin,
): Promise<RespuestaExito<Sesion> | RespuestaError> {
  await esperar();

  // Preparamos el cuerpo de la API sin cambiar el formulario ni activar HTTP.
  const cuerpo = { email: datos.email.trim().toLowerCase(), contrasena: datos.clave };
  const cuenta = cuentasMock.find(
    (item) =>
      item.email.toLowerCase() === cuerpo.email &&
      item.clave === cuerpo.contrasena,
  );

  if (!cuenta) {
    return {
      error: {
        codigo: 'CREDENCIALES_INVALIDAS',
        mensaje: 'Email o contraseña incorrectos.',
      },
    };
  }

  sesionActual = {
    token: `mock-${cuenta.usuario.id}`,
    usuario: cuenta.usuario,
  };

  return {
    datos: sesionActual,
    meta: metaUnidad(),
  };
}

export async function registrar(
  datos: DatosRegistro,
): Promise<RespuestaExito<Sesion> | RespuestaError> {
  await esperar();

  const cuerpo = {
    nombre: datos.nombre.trim(),
    email: datos.email.trim().toLowerCase(),
    contrasena: datos.clave,
  };
  const email = cuerpo.email;
  const yaExiste = cuentasMock.some(
    (item) => item.email.toLowerCase() === email,
  );

  if (yaExiste) {
    return {
      error: {
        codigo: 'EMAIL_EN_USO',
        mensaje: 'Ya hay una cuenta con ese email.',
      },
    };
  }

  const usuario: Usuario = {
    ...usuarioMock,
    id: `usr-${Date.now()}`,
    nombre: cuerpo.nombre,
    email,
    lineasFavoritas: [],
    paradasFavoritas: [],
  };

  cuentasMock.push({
    email,
    clave: cuerpo.contrasena,
    usuario,
  });

  sesionActual = {
    token: `mock-${usuario.id}`,
    usuario,
  };

  return {
    datos: sesionActual,
    meta: metaUnidad(),
  };
}

export async function cerrarSesion(): Promise<
  RespuestaExito<null> | RespuestaError
> {
  await esperar(150);
  sesionActual = null;

  return {
    datos: null,
    meta: { total: 0, pagina: 1, porPagina: 0 },
  };
}

export async function obtenerSesion(): Promise<
  RespuestaExito<Sesion | null> | RespuestaError
> {
  await esperar(100);

  return {
    datos: sesionActual,
    meta: metaUnidad(),
  };
}

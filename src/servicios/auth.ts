import { cuentasMock } from '@/mocks/cuentas';
import { usuarioMock } from '@/mocks/usuario';
import type { DatosLogin, DatosRegistro } from '@/esquemas/auth';
import type { RespuestaError, RespuestaExito } from '@/tipos/linea';
import type { Usuario } from '@/tipos/usuario';

export type Sesion = {
  token: string;
  usuario: Usuario;
};

const esperar = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));

let sesionActual: Sesion | null = null;

function metaUnidad() {
  return { total: 1, pagina: 1, porPagina: 1 };
}

export async function iniciarSesion(
  datos: DatosLogin,
): Promise<RespuestaExito<Sesion> | RespuestaError> {
  await esperar();

  const cuenta = cuentasMock.find(
    (item) =>
      item.email.toLowerCase() === datos.email.trim().toLowerCase() &&
      item.clave === datos.clave,
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

  const email = datos.email.trim().toLowerCase();
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
    nombre: datos.nombre.trim(),
    email,
    lineasFavoritas: [],
    paradasFavoritas: [],
  };

  cuentasMock.push({
    email,
    clave: datos.clave,
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

import type { DatosLogin, DatosRegistro } from '@/esquemas/auth';
import { cliente, establecerToken, normalizarError } from '@/servicios/cliente';
import { borrarToken, guardarToken, leerToken } from '@/servicios/token';
import { obtenerUsuario } from '@/servicios/usuario';
import type { RespuestaError, RespuestaUno, Sesion } from '@/tipos/api';

export async function iniciarSesion(datos: DatosLogin): Promise<Sesion | RespuestaError> {
  try {
    const respuesta = await cliente.post<RespuestaUno<Sesion>>('/auth/ingreso', {
      email: datos.email.trim().toLowerCase(),
      contrasena: datos.clave,
    });
    await guardarToken(respuesta.data.datos.token);
    return respuesta.data.datos;
  } catch (error: unknown) {
    return normalizarError(error);
  }
}

export async function registrar(datos: DatosRegistro): Promise<Sesion | RespuestaError> {
  try {
    const respuesta = await cliente.post<RespuestaUno<Sesion>>('/auth/registro', {
      nombre: datos.nombre.trim(),
      email: datos.email.trim().toLowerCase(),
      contrasena: datos.clave,
    });
    await guardarToken(respuesta.data.datos.token);
    return respuesta.data.datos;
  } catch (error: unknown) {
    return normalizarError(error);
  }
}

export async function cerrarSesion(): Promise<RespuestaError | null> {
  try {
    await borrarToken();
    return null;
  } catch (error: unknown) {
    return normalizarError(error);
  }
}

export async function obtenerSesion(): Promise<Sesion | RespuestaError | null> {
  try {
    const token = await leerToken();
    if (!token) return null;

    establecerToken(token);
    const respuesta = await obtenerUsuario();
    if ('error' in respuesta) {
      establecerToken(null);
      // Un problema de conexión no invalida el token guardado.
      if (respuesta.error.codigo === 'NO_AUTENTICADO') await borrarToken();
      return respuesta;
    }
    return { token, usuario: respuesta.datos };
  } catch (error: unknown) {
    establecerToken(null);
    return normalizarError(error);
  }
}

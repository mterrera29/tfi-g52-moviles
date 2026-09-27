import { claveMock } from '@/tipos/sesion';
import type { CuentaMock } from '@/tipos/sesion';
import { usuarioMock } from '@/mocks/usuario';

export const cuentasMock: CuentaMock[] = [
  {
    email: usuarioMock.email,
    clave: claveMock,
    usuario: usuarioMock,
  },
];

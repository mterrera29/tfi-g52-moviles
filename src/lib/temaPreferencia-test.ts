import { debeAplicarTemaDeSesion, esTemaValido, resolverModo } from './temaPreferencia';

function igual<T>(obtenido: T, esperado: T, nombre: string) {
  if (obtenido !== esperado) {
    throw new Error(`${nombre}: se esperaba ${String(esperado)} y se obtuvo ${String(obtenido)}`);
  }
}

function test(nombre: string, fn: () => void) {
  fn();
  console.log(`ok  ${nombre}`);
}

test('resolverModo respeta claro, oscuro y sistema', () => {
  igual(resolverModo('claro', 'dark'), 'claro', 'claro gana al sistema');
  igual(resolverModo('oscuro', 'light'), 'oscuro', 'oscuro gana al sistema');
  igual(resolverModo('sistema', 'dark'), 'oscuro', 'sistema dark');
  igual(resolverModo('sistema', 'light'), 'claro', 'sistema light');
});

test('esTemaValido no acepta basura', () => {
  igual(esTemaValido('claro'), true, 'claro');
  igual(esTemaValido('dark'), false, 'dark inglés');
  igual(esTemaValido(null), false, 'null');
});

test('el bug: igualar siempre servidor≠local revertiría el toque logueado', () => {
  const temaServidor: string = 'claro';
  const preferenciaNueva: string = 'oscuro';
  const bugViejo = Boolean(temaServidor && temaServidor !== preferenciaNueva);
  igual(bugViejo, true, 'el effect viejo habría vuelto a claro');
});

test('con sesión ya hidratada no se pisa un cambio local', () => {
  igual(
    debeAplicarTemaDeSesion({
      idUsuario: 'usu-1',
      idYaAplicado: 'usu-1',
      temaServidor: 'claro',
    }),
    false,
    'mismo usuario',
  );
});

test('al iniciar sesión sí se aplica el tema del perfil', () => {
  igual(
    debeAplicarTemaDeSesion({
      idUsuario: 'usu-1',
      idYaAplicado: null,
      temaServidor: 'oscuro',
    }),
    true,
    'primera hidratación',
  );
});

test('sin sesión no se aplica tema de servidor', () => {
  igual(
    debeAplicarTemaDeSesion({
      idUsuario: null,
      idYaAplicado: null,
      temaServidor: 'oscuro',
    }),
    false,
    'anónimo',
  );
});

console.log('Todos los casos de preferencia de tema pasaron.');

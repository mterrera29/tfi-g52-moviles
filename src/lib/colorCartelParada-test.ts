import {
  aspectoCartelParada,
  colorLineaValido,
  contrasteSobreColor,
  luminanciaRelativa,
  tamanoNumeroBadge,
} from './colorCartelParada';

function igual<T>(obtenido: T, esperado: T, nombre: string) {
  if (obtenido !== esperado) {
    throw new Error(`${nombre}: se esperaba ${String(esperado)} y se obtuvo ${String(obtenido)}`);
  }
}

function test(nombre: string, fn: () => void) {
  fn();
  console.log(`ok  ${nombre}`);
}

test('acepta hex de la API y rechaza basura', () => {
  igual(colorLineaValido('#1B6CA8'), true, 'lin-05');
  igual(colorLineaValido('#D9534F'), true, '6 dígitos');
  igual(colorLineaValido('#abc'), true, '3 dígitos');
  igual(colorLineaValido('azul'), false, 'nombre');
  igual(colorLineaValido('#gg0000'), false, 'no hex');
  igual(colorLineaValido(''), false, 'vacío');
  igual(colorLineaValido(null), false, 'null');
});

test('con color de línea usa ese fondo, no el azul/magenta de ida-vuelta', () => {
  const aspecto = aspectoCartelParada('#1B6CA8', 'oscuro');
  igual(aspecto.usaColorLinea, true, 'usa API');
  igual(aspecto.fondo, '#1B6CA8', 'fondo línea');
  igual(aspecto.icono, '#FFFFFF', 'icono claro sobre azul oscuro');
  igual(aspecto.fondo === '#1D4ED8', false, 'no es ida');
  igual(aspecto.fondo === '#A21CAF', false, 'no es vuelta');
});

test('color claro de línea pide tinta oscura', () => {
  const aspecto = aspectoCartelParada('#F1C40F', 'claro');
  igual(aspecto.usaColorLinea, true, 'válido');
  igual(aspecto.icono, '#1A1A1A', 'contraste');
  const lum = luminanciaRelativa('#F1C40F');
  if (lum === null || lum <= 0.55) throw new Error('el amarillo de prueba debería ser claro');
});

test('sin color o inválido no inventa y cae a neutro del tema', () => {
  igual(aspectoCartelParada(undefined, 'claro').usaColorLinea, false, 'ausente');
  igual(aspectoCartelParada('no-hex', 'oscuro').usaColorLinea, false, 'inválido');
  igual(aspectoCartelParada(undefined, 'claro').fondo, '#0B3A5D', 'neutro claro');
  igual(aspectoCartelParada(undefined, 'oscuro').fondo, '#FDE68A', 'neutro oscuro');
});

test('contrasteSobreColor usa el color de línea o un fallback, no recorta cifras', () => {
  igual(contrasteSobreColor('#1B6CA8', '#0B3A5D').fondo, '#1B6CA8', 'API');
  igual(contrasteSobreColor('roto', '#0B3A5D').fondo, '#0B3A5D', 'fallback');
  igual(tamanoNumeroBadge('5', 16) > tamanoNumeroBadge('14', 16) || tamanoNumeroBadge('5', 16) === 16, true, '1-2 dígitos base');
  igual(tamanoNumeroBadge('14', 16), 16, 'dos dígitos');
  igual(tamanoNumeroBadge('100', 16) < 16, true, 'tres dígitos más chico');
});

console.log('Todos los casos de color de cartel de parada pasaron.');

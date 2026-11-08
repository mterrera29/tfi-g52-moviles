import type { ModoTema } from '@/temas/paleta';

export type AspectoCartelParada = {
  fondo: string;
  icono: string;
  borde: string;
  usaColorLinea: boolean;
};

const HEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
const OSCURO = '#1A1A1A';
const CLARO = '#FFFFFF';

export function colorLineaValido(valor: string | null | undefined): valor is string {
  return typeof valor === 'string' && HEX.test(valor.trim());
}

function canalALineal(canal: number): number {
  const c = canal / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function rgbDeHex(hex: string): { r: number; g: number; b: number } | null {
  if (!colorLineaValido(hex)) return null;
  const crudo = hex.trim().slice(1);
  const normalizado =
    crudo.length === 3
      ? crudo
          .split('')
          .map((c) => c + c)
          .join('')
      : crudo;
  const r = Number.parseInt(normalizado.slice(0, 2), 16);
  const g = Number.parseInt(normalizado.slice(2, 4), 16);
  const b = Number.parseInt(normalizado.slice(4, 6), 16);
  if (![r, g, b].every((n) => Number.isFinite(n))) return null;
  return { r, g, b };
}

export function luminanciaRelativa(hex: string): number | null {
  const rgb = rgbDeHex(hex);
  if (!rgb) return null;
  return 0.2126 * canalALineal(rgb.r) + 0.7152 * canalALineal(rgb.g) + 0.0722 * canalALineal(rgb.b);
}

export function contrasteSobreColor(
  colorLinea: string | null | undefined,
  fallbackFondo: string,
): { fondo: string; tinta: string } {
  const fondo = colorLineaValido(colorLinea) ? colorLinea.trim() : fallbackFondo;
  const lum = luminanciaRelativa(fondo);
  const tintaClara = lum !== null && lum > 0.55;
  return { fondo, tinta: tintaClara ? OSCURO : CLARO };
}

export function tamanoNumeroBadge(numero: string, base: number): number {
  const largo = numero.trim().length;
  if (largo <= 2) return base;
  if (largo === 3) return Math.round(base * 0.78);
  return Math.round(base * 0.62);
}

export function aspectoCartelParada(
  colorLinea: string | null | undefined,
  modo: ModoTema,
): AspectoCartelParada {
  if (colorLineaValido(colorLinea)) {
    const lum = luminanciaRelativa(colorLinea);
    const tintaClara = lum !== null && lum > 0.55;
    const tinta = tintaClara ? OSCURO : CLARO;
    return {
      fondo: colorLinea.trim(),
      icono: tinta,
      borde: tinta,
      usaColorLinea: true,
    };
  }

  if (modo === 'oscuro') {
    return { fondo: '#FDE68A', icono: OSCURO, borde: '#E5E7EB', usaColorLinea: false };
  }
  return { fondo: '#0B3A5D', icono: CLARO, borde: OSCURO, usaColorLinea: false };
}

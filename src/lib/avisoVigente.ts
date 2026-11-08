import type { Aviso } from '@/tipos/aviso';

export function avisoVigente(aviso: Aviso, ahora = new Date()): boolean {
  const desde = Date.parse(aviso.desde);
  if (Number.isNaN(desde) || desde > ahora.getTime()) return false;
  if (aviso.hasta === null) return true;
  const hasta = Date.parse(aviso.hasta);
  if (Number.isNaN(hasta)) return false;
  return ahora.getTime() <= hasta;
}

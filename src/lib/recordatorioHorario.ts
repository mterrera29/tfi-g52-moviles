import { instanteParana } from '@/lib/zonaParana';

export const MINUTOS_ANTES_RECORDATORIO = 10;

export type PedidoRecordatorio = {
  paradaId: string;
  paradaNombre: string;
  horarioId: string;
  lineaId: string;
  lineaNumero: string;
  hora: string;
  fechaServicio: string | null;
  minutosRestantes: number | null;
};

export type RecordatorioCalculado = {
  clave: string;
  disparo: Date;
  titulo: string;
  cuerpo: string;
  ruta: string;
};

export function claveRecordatorio(
  paradaId: string,
  horarioId: string,
  fechaServicio: string,
  hora: string,
): string {
  const horaClave = hora.replace(':', '');
  return `rec-${paradaId}-${horarioId}-${fechaServicio}-${horaClave}`;
}

export function instanteRecordatorioTabla(
  fechaServicio: string,
  hora: string,
): Date | null {
  const paso = instanteParana(fechaServicio, hora);
  if (!paso) return null;
  return new Date(paso.getTime() - MINUTOS_ANTES_RECORDATORIO * 60_000);
}

export function calcularRecordatorio(
  pedido: PedidoRecordatorio,
  ahora: Date,
): { ok: true; recordatorio: RecordatorioCalculado } | { ok: false; motivo: string } {
  if (!pedido.fechaServicio) {
    return {
      ok: false,
      motivo: 'Sin fecha de servicio no se puede armar el recordatorio (faltan tablas o feriados).',
    };
  }
  if (pedido.minutosRestantes === null) {
    return {
      ok: false,
      motivo: 'Este horario no tiene minutos según la tabla, no se programa a ciegas.',
    };
  }
  if (pedido.minutosRestantes < MINUTOS_ANTES_RECORDATORIO) {
    return {
      ok: false,
      motivo: `Ya falta menos de ${MINUTOS_ANTES_RECORDATORIO} min según la tabla.`,
    };
  }

  const disparo = instanteRecordatorioTabla(pedido.fechaServicio, pedido.hora);
  if (!disparo) {
    return { ok: false, motivo: 'La hora de la tabla no se pudo interpretar.' };
  }
  if (disparo.getTime() <= ahora.getTime()) {
    return { ok: false, motivo: 'El aviso de 10 min ya habría pasado.' };
  }

  const linea = pedido.lineaNumero ? `Línea ${pedido.lineaNumero}` : 'Tu línea';
  return {
    ok: true,
    recordatorio: {
      clave: claveRecordatorio(pedido.paradaId, pedido.horarioId, pedido.fechaServicio, pedido.hora),
      disparo,
      titulo: 'Recordatorio de horario',
      cuerpo: `${linea} en ${pedido.paradaNombre}: según la tabla pasa a las ${pedido.hora}. No es GPS ni tiempo real.`,
      ruta: `/parada/${pedido.paradaId}`,
    },
  };
}

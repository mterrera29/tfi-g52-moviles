import { largoTrazadoKm, resumirHorarios } from './resumenLinea';
import type { Horario } from '../tipos/horario';

function igual<T>(obtenido: T, esperado: T, nombre: string) {
  if (obtenido !== esperado) {
    throw new Error(`${nombre}: se esperaba ${String(esperado)} y se obtuvo ${String(obtenido)}`);
  }
}

const h = (hora: string, lineaId = 'L1', sentido: 'ida' | 'vuelta' = 'ida'): Horario => ({
  id: hora + lineaId + sentido,
  lineaId,
  paradaId: 'P1',
  sentido,
  tipoDeDia: 'habil',
  hora,
});

const r = resumirHorarios([h('06:00:00'), h('06:30'), h('07:00'), h('23:10'), h('08:00', 'L2')], 'L1', 'ida');
igual(r?.primero, '06:00', 'primero');
igual(r?.ultimo, '23:10', 'ultimo');
igual(r?.cadaMinutos, 30, 'mediana');
igual(resumirHorarios([h('06:00')], 'L1', 'vuelta'), null, 'sin sentido');
igual(resumirHorarios([h('06:00')], 'L1', 'ida')?.cadaMinutos, null, 'un solo servicio');
igual(largoTrazadoKm([]), null, 'trazado vacío');
const km = largoTrazadoKm([{ latitud: 0, longitud: 0 }, { latitud: 0, longitud: 0.01 }]);
igual(Math.round((km ?? 0) * 10), 11, 'km ~1.1');

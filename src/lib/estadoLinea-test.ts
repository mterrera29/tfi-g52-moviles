import { estadosDeLineas } from './estadoLinea';
import type { Aviso } from '../tipos/aviso';

function igual<T>(obtenido: T, esperado: T, nombre: string) {
  if (obtenido !== esperado) {
    throw new Error(`${nombre}: se esperaba ${String(esperado)} y se obtuvo ${String(obtenido)}`);
  }
}

const aviso = (gravedad: Aviso['gravedad'], lineaIds: string[]): Aviso => ({
  id: 'a', titulo: '', detalle: '', lineaIds, desde: '', hasta: null, gravedad,
  trazadoAlternativo: null, videoUrl: null,
});

const e = estadosDeLineas([
  aviso('informativo', ['L1']),
  aviso('desvio', ['L2', 'L3']),
  aviso('suspension', ['L3']),
  aviso('desvio', ['L3']),
]);
igual(e.L1, undefined, 'informativo no cuenta');
igual(e.L2, 'desvio', 'desvío');
igual(e.L3, 'suspension', 'la suspensión gana');

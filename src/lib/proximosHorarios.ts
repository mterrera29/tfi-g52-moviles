import type { Feriado } from '@/tipos/api';
import type { Horario } from '@/tipos/horario';
import { elegirTipoDeDia } from '@/lib/tipoDeDia';

function minutosDesdeMedianoche(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

function horaActualEnMinutos(fecha: Date): number {
  return fecha.getHours() * 60 + fecha.getMinutes();
}

function ordenarPorHora(a: Horario, b: Horario): number {
  return minutosDesdeMedianoche(a.hora) - minutosDesdeMedianoche(b.hora);
}

function proximosDelDia(
  horarios: Horario[],
  ahora: Date,
  cantidad: number,
): Horario[] {
  const minutosAhora = horaActualEnMinutos(ahora);
  return horarios
    .filter((horario) => minutosDesdeMedianoche(horario.hora) >= minutosAhora)
    .sort(ordenarPorHora)
    .slice(0, cantidad);
}

export function proximosHorariosDesdeTabla(
  tablas: Horario[],
  feriados: Feriado[],
  cantidad: number,
  ahora = new Date(),
): Horario[] {
  const hoy = proximosDelDia(
    tablas.filter((h) => h.tipoDeDia === elegirTipoDeDia(ahora, feriados)),
    ahora,
    cantidad,
  );
  if (hoy.length >= cantidad) return hoy;

  const manana = new Date(ahora);
  manana.setDate(manana.getDate() + 1);
  manana.setHours(0, 0, 0, 0);
  const tipoManana = elegirTipoDeDia(manana, feriados);
  const restantes = cantidad - hoy.length;
  const deManana = tablas
    .filter((h) => h.tipoDeDia === tipoManana)
    .sort(ordenarPorHora)
    .slice(0, restantes);

  return [...hoy, ...deManana];
}

export function todosHorariosParada(
  porTipo: Partial<Record<Horario['tipoDeDia'], Horario[]>>,
): Horario[] {
  return (['habil', 'sabado', 'domingo', 'feriado'] as const).flatMap((tipo) => porTipo[tipo] ?? []);
}

export function mensajeSinProximosServicio(
  tablas: Horario[],
  feriados: Feriado[],
  ahora = new Date(),
): string {
  if (proximosHorariosDesdeTabla(tablas, feriados, 1, ahora).length > 0) {
    return 'No hay próximos servicios para esta parada.';
  }

  const manana = new Date(ahora);
  manana.setDate(manana.getDate() + 1);
  manana.setHours(0, 0, 0, 0);
  const tipoManana = elegirTipoDeDia(manana, feriados);
  const primerManana = tablas
    .filter((horario) => horario.tipoDeDia === tipoManana)
    .sort(ordenarPorHora)[0];

  if (primerManana) {
    return `No hay más servicio hasta mañana a las ${primerManana.hora}`;
  }

  return 'No hay próximos servicios para esta parada.';
}

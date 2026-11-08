export function formatearAntiguedad(iso: string | null): string | null {
  if (!iso) return null;
  const instante = Date.parse(iso);
  if (Number.isNaN(instante)) return null;

  const diffMs = Date.now() - instante;
  if (diffMs < 0) return 'recién actualizada';

  const minutos = Math.floor(diffMs / 60_000);
  if (minutos < 1) return 'hace un momento';
  if (minutos < 60) return `hace ${minutos} min`;

  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;

  const dias = Math.floor(horas / 24);
  if (dias === 1) return 'hace 1 día';
  return `hace ${dias} días`;
}

export function formatearFechaHora(iso: string | null): string | null {
  if (!iso) return null;
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return null;
  return fecha.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

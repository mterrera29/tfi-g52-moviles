import type { Aviso } from '@/tipos/aviso';

export const avisosMock: Aviso[] = [
  {
    id: 'avi-088',
    titulo: 'Desvío por obra en calle Corrientes',
    detalle:
      'Desde hoy la línea 2 desvía por Santa Fe entre Mitre y Gral. Paz.',
    lineaIds: ['lin-02'],
    desde: '2026-09-14T00:00:00-03:00',
    hasta: null,
    gravedad: 'desvio',
    trazadoAlternativo: null,
    videoUrl: null,
  },
  {
    id: 'avi-091',
    titulo: 'Servicio suspendido en Línea 14',
    detalle: 'Por reunión gremial no circula hasta las 14:00.',
    lineaIds: ['lin-14'],
    desde: '2026-09-13T06:00:00-03:00',
    hasta: '2026-09-13T14:00:00-03:00',
    gravedad: 'suspension',
    trazadoAlternativo: null,
    videoUrl: null,
  },
  {
    id: 'avi-095',
    titulo: 'Nueva parada con refugio en Alameda',
    detalle: 'Se habilitó refugio en Alameda y Urquiza.',
    lineaIds: ['lin-05', 'lin-14'],
    desde: '2026-09-10T00:00:00-03:00',
    hasta: null,
    gravedad: 'informativo',
    trazadoAlternativo: null,
    videoUrl: null,
  },
];

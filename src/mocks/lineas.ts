import type { Linea } from '@/tipos/linea';
export const lineasMock: Linea[] = [
  {
    id: 'lin-05',
    numero: '5',
    nombre: 'Puerto Viejo — San Agustín',
    color: '#1B6CA8',
    empresa: 'Transporte Mariano Moreno',
    activa: true,
    recorridos: [
      {
        sentido: 'ida',
        destino: 'hacia Puerto Viejo',
        trazado: [
          { latitud: -31.7333, longitud: -60.5241 },
          { latitud: -31.735, longitud: -60.52 },
        ],
        paradaIds: ['par-101', 'par-102', 'par-103'],
      },
      {
        sentido: 'vuelta',
        destino: 'hacia San Agustín',
        trazado: [
          { latitud: -31.735, longitud: -60.52 },
          { latitud: -31.7333, longitud: -60.5241 },
        ],
        paradaIds: ['par-103', 'par-102', 'par-101'],
      },
    ],
  },
  {
    id: 'lin-14',
    numero: '14',
    nombre: 'Bajada Grande — Centro',
    color: '#2E8B57',
    empresa: 'Empresa del Norte',
    activa: true,
    recorridos: [
      {
        sentido: 'ida',
        destino: 'hacia Bajada Grande',
        trazado: [{ latitud: -31.74, longitud: -60.53 }],
        paradaIds: ['par-101', 'par-201'],
      },
      {
        sentido: 'vuelta',
        destino: 'hacia Centro',
        trazado: [{ latitud: -31.73, longitud: -60.52 }],
        paradaIds: ['par-201', 'par-101'],
      },
    ],
  },
  {
    id: 'lin-02',
    numero: '2',
    nombre: 'Centro — Villa Urquiza',
    color: '#C0392B',
    empresa: 'Transportes del Paraná',
    activa: true,
    recorridos: [
      {
        sentido: 'ida',
        destino: 'hacia Villa Urquiza',
        trazado: [{ latitud: -31.732, longitud: -60.525 }],
        paradaIds: ['par-301', 'par-302'],
      },
      {
        sentido: 'vuelta',
        destino: 'hacia Centro',
        trazado: [{ latitud: -31.731, longitud: -60.523 }],
        paradaIds: ['par-302', 'par-301'],
      },
    ],
  },
];

import { proximosHorariosDesdeTabla } from '@/lib/proximosHorarios';
import type { Horario } from '@/tipos/horario';

describe('proximosHorariosDesdeTabla', () => {
  it('devuelve horarios ordenados por hora', () => {
    const horarios: Horario[] = [
      { id: '1', lineaId: 'L1', paradaId: 'P1', sentido: 'ida', tipoDeDia: 'habil', hora: '10:00' },
      { id: '2', lineaId: 'L1', paradaId: 'P1', sentido: 'ida', tipoDeDia: 'habil', hora: '09:00' },
      { id: '3', lineaId: 'L1', paradaId: 'P1', sentido: 'ida', tipoDeDia: 'habil', hora: '08:00' },
    ];
    const ahora = new Date('2024-01-01T07:00:00');
    const resultado = proximosHorariosDesdeTabla(horarios, [], 2, ahora);
    expect(resultado).toHaveLength(2);
    expect(resultado[0].hora).toBe('08:00');
    expect(resultado[1].hora).toBe('09:00');
  });
});

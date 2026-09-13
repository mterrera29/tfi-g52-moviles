export type Tema = 'claro' | 'oscuro' | 'sistema';

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  lineasFavoritas: string[];
  paradasFavoritas: string[];
  avisosActivos: boolean;
  tema: Tema;
}

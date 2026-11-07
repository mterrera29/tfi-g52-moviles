import Storage from 'expo-sqlite/kv-store';

export function guardarJson(clave: string, valor: unknown): void {
  Storage.setItemSync(clave, JSON.stringify(valor));
}

export function leerJson<T>(clave: string): T | null {
  const crudo = Storage.getItemSync(clave);
  if (crudo === null || crudo === '') return null;
  try {
    return JSON.parse(crudo) as T;
  } catch {
    return null;
  }
}

export function guardarTexto(clave: string, valor: string): void {
  Storage.setItemSync(clave, valor);
}

export function leerTexto(clave: string): string | null {
  return Storage.getItemSync(clave);
}

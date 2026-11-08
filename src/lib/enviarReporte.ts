import {
  cuerpoPostReporteDemora,
  debeDrenarItem,
  interpretarRespuestaReporte,
  type CuerpoPostReporteDemora,
  type ItemColaReporte,
  type ResultadoIntentoReporte,
} from '@/lib/colaReportes';

export type DependenciasEnvioReporte = {
  subirArchivo: (uriLocal: string) => Promise<string>;
  crearReporte: (cuerpo: CuerpoPostReporteDemora) => Promise<string | null>;
  persistirItem: (item: ItemColaReporte) => Promise<void>;
  borrarItem: (id: string) => Promise<void>;
};

export function crearExclusionDrenaje() {
  let cola: Promise<void> = Promise.resolve();
  return async function ejecutar(trabajo: () => Promise<void>): Promise<'hecho'> {
    const corrida = cola.then(trabajo, trabajo);
    cola = corrida.then(
      () => undefined,
      () => undefined,
    );
    await corrida;
    return 'hecho';
  };
}

export async function enviarUnItem(
  item: ItemColaReporte,
  deps: DependenciasEnvioReporte,
): Promise<{ resultado: ResultadoIntentoReporte; item: ItemColaReporte }> {
  let actual = { ...item, intentos: item.intentos + 1 };

  try {
    if (actual.fotoLocalUri && !actual.fotoRemotaUri) {
      const url = await deps.subirArchivo(actual.fotoLocalUri);
      actual = { ...actual, fotoRemotaUri: url, lastErrorCodigo: null };
      await deps.persistirItem(actual);
    }

    const codigo = await deps.crearReporte(cuerpoPostReporteDemora(actual));
    const resultado = interpretarRespuestaReporte(codigo);

    if (resultado === 'enviado') {
      await deps.borrarItem(actual.id);
      return { resultado, item: { ...actual, lastErrorCodigo: null } };
    }

    actual = { ...actual, lastErrorCodigo: codigo };
    await deps.persistirItem(actual);
    return { resultado, item: actual };
  } catch (error) {
    const codigo =
      typeof error === 'object' &&
      error !== null &&
      'error' in error &&
      typeof (error as { error: { codigo?: string } }).error?.codigo === 'string'
        ? (error as { error: { codigo: string } }).error.codigo
        : 'ERROR_INTERNO';
    const resultado = interpretarRespuestaReporte(codigo);
    actual = { ...actual, lastErrorCodigo: codigo };
    if (resultado === 'enviado') {
      await deps.borrarItem(actual.id);
      return { resultado, item: actual };
    }
    await deps.persistirItem(actual);
    return { resultado, item: actual };
  }
}

export async function drenarCola(
  items: ItemColaReporte[],
  sesionUsuarioId: string | null,
  deps: DependenciasEnvioReporte,
): Promise<{ enviados: number; encolados: number; omitidos: number; detener: boolean }> {
  let enviados = 0;
  let encolados = 0;
  let omitidos = 0;
  let detener = false;

  for (const item of items) {
    if (!debeDrenarItem(item, sesionUsuarioId)) {
      omitidos += 1;
      continue;
    }
    const { resultado, item: actualizado } = await enviarUnItem(item, deps);
    if (resultado === 'enviado') enviados += 1;
    else encolados += 1;
    if (actualizado.lastErrorCodigo === 'NO_AUTENTICADO') {
      detener = true;
      break;
    }
  }

  return { enviados, encolados, omitidos, detener };
}

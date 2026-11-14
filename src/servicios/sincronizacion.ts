import { Platform } from 'react-native';

import { obtenerConexion } from '@/db/conexion';
import {
  fechaDesdeCabecera,
  persistirFeriados,
  persistirLineas,
  persistirParadas,
  persistirTablasHorarios,
  registrarUltimaSincronizacion,
} from '@/db/sqlite';
import { leerTexto, guardarTexto } from '@/lib/almacenClaveValor';
import { partesParana } from '@/lib/zonaParana';
import { CLAVES } from '@/servicios/claves';
import { cliente } from '@/servicios/cliente';
import { obtenerFeriados } from '@/servicios/feriados';
import { guardarRecorridos } from '@/servicios/recorridosGuardados';
import type { RespuestaLista } from '@/tipos/api';
import type { Horario, TipoDeDia } from '@/tipos/horario';
import type { Linea } from '@/tipos/linea';
import type { Parada } from '@/tipos/parada';

// PRD p.3 y p.11: recorridos y horarios "se bajan una vez y se consultan localmente".
// Con conexión bajamos todo lo que casi no cambia y lo guardamos en SQLite (U5.Pers diap. 11 y 27).

const TIPOS_DE_DIA: TipoDeDia[] = ['habil', 'sabado', 'domingo', 'feriado'];

// Los horarios casi no cambian (PRD p.11): con actualizar como mucho cada 12 horas alcanza.
const HORAS_ENTRE_SINCRONIZACIONES = 12;

let enCurso: Promise<void> | null = null;

function sincronizacionReciente(): boolean {
  // kv-store es sincrónico: se lee al toque, sin await (U5.Pers diap. 6 a 8).
  const ultima = leerTexto(CLAVES.ultimaSincronizacionCompleta);
  if (!ultima) return false;
  const horas = (Date.now() - Date.parse(ultima)) / 3_600_000;
  return horas >= 0 && horas < HORAS_ENTRE_SINCRONIZACIONES;
}

export function sincronizarTodo(): Promise<void> {
  if (Platform.OS === 'web') return Promise.resolve();
  if (sincronizacionReciente()) return Promise.resolve();
  // Si ya hay una sincronización andando, no arrancamos otra.
  enCurso ??= bajarYGuardarTodo().finally(() => {
    enCurso = null;
  });
  return enCurso;
}

async function bajarYGuardarTodo(): Promise<void> {
  const db = obtenerConexion();

  const [respuestaLineas, respuestaParadas] = await Promise.all([
    cliente.get<RespuestaLista<Linea>>('/lineas', { params: { porPagina: 100 } }),
    cliente.get<RespuestaLista<Parada>>('/paradas', { params: { porPagina: 1000 } }),
  ]);
  const lineas = respuestaLineas.data.datos;
  const paradas = respuestaParadas.data.datos;

  // La API pide lineaId o paradaId: bajamos la tabla entera de cada línea (porPagina=5000).
  const horariosPorLinea = await Promise.all(
    lineas.map((linea) =>
      cliente
        .get<RespuestaLista<Horario>>('/horarios', { params: { lineaId: linea.id, porPagina: 5000 } })
        .then((r) => r.data.datos),
    ),
  );

  const anio = Number(partesParana(new Date()).ymd.slice(0, 4));
  const feriados = (await Promise.all([obtenerFeriados(anio), obtenerFeriados(anio + 1)])).flatMap(
    (lista) => lista.datos,
  );

  // Se agrupan por parada y tipo de día, que es como los lee la pantalla de la parada.
  // Cada parada queda con los cuatro tipos (aunque alguno esté vacío) para saber que la tabla está completa.
  const tablas = new Map<string, Horario[]>();
  for (const parada of paradas) {
    for (const tipo of TIPOS_DE_DIA) tablas.set(`${parada.id}|${tipo}`, []);
  }
  for (const horario of horariosPorLinea.flat()) {
    const clave = `${horario.paradaId}|${horario.tipoDeDia}`;
    const lista = tablas.get(clave) ?? [];
    lista.push(horario);
    tablas.set(clave, lista);
  }

  await persistirLineas(db, lineas);
  await persistirParadas(db, paradas);
  await persistirFeriados(db, feriados);
  await persistirTablasHorarios(
    db,
    [...tablas].map(([clave, horarios]) => {
      const [paradaId, tipoDeDia] = clave.split('|') as [string, TipoDeDia];
      return { paradaId, tipoDeDia, horarios };
    }),
  );
  guardarRecorridos(lineas);
  // Solo se marca si salió todo bien: si algo falló, se vuelve a intentar la próxima vez que haya red.
  guardarTexto(CLAVES.ultimaSincronizacionCompleta, new Date().toISOString());
  registrarUltimaSincronizacion(fechaDesdeCabecera(respuestaLineas.headers.date as string | undefined));
}

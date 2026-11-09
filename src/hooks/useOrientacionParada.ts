import { useFocusEffect } from 'expo-router';
import * as Location from 'expo-location';
import { Magnetometer } from 'expo-sensors';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

import {
  CONSEJO_HORIZONTAL,
  METROS_EN_LA_PARADA,
  METROS_PRECISION_DUDOSA,
  actualizarFiltroMagnetico,
  anguloCambioVisible,
  campoMagneticoDudoso,
  convieneMantenerHorizontal,
  coordenadasValidas,
  destinoSigueSiendo,
  distanciaEntre,
  faltaSenalOrientacion,
  hayQueInvalidarGps,
  lecturaMagneticaUsable,
  posicionGpsConCoordenadas,
  posicionGpsUsable,
  rotacionHaciaDestino,
  rumboGeografico,
  suavizarAngulo,
  timestampGpsAMs,
  type LecturaMagnetica,
} from '@/lib/rumboParada';
import { resolverWatchSiVigente, sesionVigente } from '@/lib/suscripcionVigente';
import type { Coordenadas } from '@/tipos/linea';

const INTERVALO_MAGNETOMETRO_MS = 300;
const INTERVALO_GPS_MS = 2500;
const INTERVALO_EDAD_GPS_MS = 5_000;
const MS_ESPERA_SENAL = 8_000;

const OPCIONES_GPS: Location.LocationOptions = {
  accuracy: Location.Accuracy.Balanced,
  timeInterval: INTERVALO_GPS_MS,
  distanceInterval: 0,
  mayShowUserSettingsDialog: false,
};

export const MENSAJE_SIN_BRUJULA =
  'Este teléfono no tiene brújula usable. Podés usar Cómo llegar.';
export const MENSAJE_PERMISO_UBICACION =
  'Para orientar la flecha hace falta el permiso de ubicación. No usamos ubicación en segundo plano.';
export const MENSAJE_PERMISO_SENSOR =
  'No se pudo usar el magnetómetro. Revisá el permiso del sensor o usá Cómo llegar.';
export const MENSAJE_SIN_FIX =
  'No llega una posición GPS nueva. Revisá que el GPS esté encendido o usá Cómo llegar.';
export const MENSAJE_SENSOR_NULO =
  'La brújula no está dando datos válidos. Alejá el teléfono de metal y movelo en forma de ocho para calibrar.';
export const MENSAJE_POSICION_VIEJA =
  'La posición se quedó vieja. La flecha no se muestra hasta un GPS nuevo.';
export const MENSAJE_SIN_DATOS_BRUJULA =
  'La brújula no está enviando datos. Podés usar Cómo llegar.';
export const MENSAJE_SIN_GPS_NI_BRUJULA =
  'No llega la posición GPS ni datos de la brújula. Revisá el GPS y el magnetómetro, o usá Cómo llegar.';
export const MENSAJE_GPS_CACHE =
  'Usamos la última posición conocida: puede estar desactualizada. La flecha es orientativa.';

type AvisoOrientacion = {
  postura: string | null;
  calibracion: string | null;
  precision: string | null;
};

function mensajePorFalta(falta: ReturnType<typeof faltaSenalOrientacion>): string | null {
  if (falta === 'gps') return MENSAJE_SIN_FIX;
  if (falta === 'brujula') return MENSAJE_SIN_DATOS_BRUJULA;
  if (falta === 'ambas') return MENSAJE_SIN_GPS_NI_BRUJULA;
  return null;
}

export function useOrientacionParada(destino: Coordenadas | null, paradaId: string) {
  const [activa, setActiva] = useState(false);
  const [ciclo, setCiclo] = useState(0);
  const [enFoco, setEnFoco] = useState(true);
  const [appActiva, setAppActiva] = useState(
    AppState.currentState === 'active' || AppState.currentState === 'unknown',
  );
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rotacion, setRotacion] = useState<number | null>(null);
  const [distancia, setDistancia] = useState<number | null>(null);
  const [enLaParada, setEnLaParada] = useState(false);
  // Qué señales llegaron ya: sirve para decirle al usuario qué falta mientras busca.
  const [senales, setSenales] = useState({ gps: false, brujula: false });
  const [avisos, setAvisos] = useState<AvisoOrientacion>({
    postura: null,
    calibracion: null,
    precision: null,
  });

  const destinoRef = useRef(destino);
  const paradaIdRef = useRef(paradaId);
  destinoRef.current = destino;
  paradaIdRef.current = paradaId;

  const magSub = useRef<{ remove: () => void } | null>(null);
  const gpsSub = useRef<{ remove: () => void } | null>(null);
  const rumboDestinoRef = useRef<number | null>(null);
  const rumboTelRef = useRef<number | null>(null);
  const rotacionRef = useRef<number | null>(null);
  const sesionRef = useRef(0);

  const publicarRotacion = useCallback(() => {
    const rumbo = rumboDestinoRef.current;
    const tel = rumboTelRef.current;
    if (rumbo === null || tel === null) {
      rotacionRef.current = null;
      setRotacion(null);
      return;
    }
    const cruda = rotacionHaciaDestino(rumbo, tel);
    if (cruda === null) {
      rotacionRef.current = null;
      setRotacion(null);
      return;
    }
    const siguiente =
      rotacionRef.current === null ? cruda : suavizarAngulo(rotacionRef.current, cruda, 0.28);
    if (!anguloCambioVisible(rotacionRef.current, siguiente, 2.5) && rotacionRef.current !== null) {
      return;
    }
    rotacionRef.current = siguiente;
    setRotacion(siguiente);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setEnFoco(true);
      return () => setEnFoco(false);
    }, []),
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (estado) => {
      setAppActiva(estado === 'active' || estado === 'unknown');
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    rotacionRef.current = null;
    rumboDestinoRef.current = null;
    rumboTelRef.current = null;
    setRotacion(null);
    setDistancia(null);
    setEnLaParada(false);
    setError(null);
  }, [paradaId, destino?.latitud, destino?.longitud]);

  useEffect(() => {
    const sensoresVivos = activa && enFoco && appActiva;
    if (!sensoresVivos) {
      magSub.current?.remove();
      magSub.current = null;
      gpsSub.current?.remove();
      gpsSub.current = null;
      setCargando(false);
      return;
    }

    const sesion = ++sesionRef.current;
    let cancelado = false;
    let magEsta: { remove: () => void } | null = null;
    let gpsEsta: { remove: () => void } | null = null;
    let gpsAgeTimer: ReturnType<typeof setInterval> | null = null;
    let esperaTimer: ReturnType<typeof setTimeout> | null = null;
    let filtroMag: LecturaMagnetica | null = null;
    let ultimoFixVivoMs: number | null = null;
    let gpsOk = false;
    let magOk = false;
    let lecturasMalas = 0;
    setCargando(true);
    setError(null);
    setSenales({ gps: false, brujula: false });

    const marcarSenales = () =>
      setSenales((previo) =>
        previo.gps === gpsOk && previo.brujula === magOk ? previo : { gps: gpsOk, brujula: magOk },
      );

    const vigente = () => sesionVigente(cancelado, sesion, sesionRef.current);

    const soltarEstaSesion = () => {
      const mag = magEsta;
      const gps = gpsEsta;
      magEsta = null;
      gpsEsta = null;
      if (gpsAgeTimer !== null) {
        clearInterval(gpsAgeTimer);
        gpsAgeTimer = null;
      }
      if (esperaTimer !== null) {
        clearTimeout(esperaTimer);
        esperaTimer = null;
      }
      mag?.remove();
      gps?.remove();
      if (magSub.current === mag) magSub.current = null;
      if (gpsSub.current === gps) gpsSub.current = null;
    };

    const adoptarGps = (sub: { remove: () => void }) => {
      if (!vigente()) {
        sub.remove();
        return;
      }
      gpsEsta = sub;
      gpsSub.current = sub;
    };

    const avisarFaltaSenal = () => {
      if (!vigente()) return;
      setCargando(false);
      const mensaje = mensajePorFalta(faltaSenalOrientacion(gpsOk, magOk));
      if (mensaje) setError(mensaje);
    };

    const invalidarGpsVivoVencido = () => {
      rumboDestinoRef.current = null;
      gpsOk = false;
      marcarSenales();
      setDistancia(null);
      setEnLaParada(false);
      rotacionRef.current = null;
      setRotacion(null);
      setError(MENSAJE_POSICION_VIEJA);
      setCargando(false);
    };

    async function arrancar() {
      const destinoActual = destinoRef.current;
      const idActual = paradaIdRef.current;
      if (!destinoSigueSiendo(idActual, paradaIdRef.current) || !coordenadasValidas(destinoActual)) {
        if (vigente()) {
          setError('No hay coordenadas reales de esta parada para orientar la flecha.');
          setCargando(false);
        }
        return;
      }
      if (Platform.OS === 'web') {
        if (vigente()) {
          setError(MENSAJE_SIN_BRUJULA);
          setCargando(false);
        }
        return;
      }

      const hayMagnetometro = await Magnetometer.isAvailableAsync();
      if (!vigente()) return;
      if (!hayMagnetometro) {
        setError(MENSAJE_SIN_BRUJULA);
        setCargando(false);
        return;
      }

      // Primero se mira el estado: pedir de nuevo con el permiso ya dado pausa la app un instante y
      // eso reiniciaba la orientación una y otra vez.
      let permisoUbicacion = await Location.getForegroundPermissionsAsync();
      if (permisoUbicacion.status !== 'granted') {
        permisoUbicacion = await Location.requestForegroundPermissionsAsync();
      }
      if (!vigente()) return;
      if (permisoUbicacion.status !== 'granted') {
        setError(MENSAJE_PERMISO_UBICACION);
        setCargando(false);
        return;
      }

      let permisoSensor = await Magnetometer.getPermissionsAsync();
      if (!permisoSensor.granted) {
        permisoSensor = await Magnetometer.requestPermissionsAsync();
      }
      if (!vigente()) return;
      if (!permisoSensor.granted) {
        setError(MENSAJE_PERMISO_SENSOR);
        setCargando(false);
        return;
      }

      function aplicarPosicion(posicion: Location.LocationObject, esVivo: boolean) {
        if (!vigente()) return;
        if (!destinoSigueSiendo(paradaIdRef.current, idActual)) return;
        const destinoVivo = destinoRef.current;
        if (!coordenadasValidas(destinoVivo)) return;
        const coords = {
          latitud: posicion.coords.latitude,
          longitud: posicion.coords.longitude,
        };
        if (!posicionGpsConCoordenadas(coords)) return;

        const fresca = posicionGpsUsable({
          latitud: coords.latitud,
          longitud: coords.longitud,
          timestampMs: timestampGpsAMs(posicion.timestamp),
          ahoraMs: Date.now(),
        });
        if (esVivo && !fresca && gpsOk) {
          return;
        }
        if (!esVivo && !fresca && gpsOk) {
          return;
        }

        gpsOk = true;
        marcarSenales();
        if (esVivo) ultimoFixVivoMs = Date.now();

        const metros = distanciaEntre(coords, destinoVivo);
        setDistancia(metros);
        const accuracy = posicion.coords.accuracy;
        const precisionGps =
          accuracy != null && Number.isFinite(accuracy) && accuracy > METROS_PRECISION_DUDOSA
            ? 'La posición GPS es poco precisa. La flecha es orientativa.'
            : !fresca
              ? MENSAJE_GPS_CACHE
              : null;
        setAvisos((prev) => ({ ...prev, precision: precisionGps }));

        if (metros !== null && metros < METROS_EN_LA_PARADA) {
          rumboDestinoRef.current = null;
          setEnLaParada(true);
          rotacionRef.current = null;
          setRotacion(null);
          if (magOk) {
            setError(null);
            setCargando(false);
          }
          return;
        }

        const rumbo = rumboGeografico(coords, destinoVivo);
        rumboDestinoRef.current = rumbo;
        setEnLaParada(false);
        if (magOk) {
          setError(null);
          setCargando(false);
        }
        publicarRotacion();
      }

      Magnetometer.setUpdateInterval(INTERVALO_MAGNETOMETRO_MS);
      const magNueva = Magnetometer.addListener((lectura) => {
        if (!vigente()) return;
        const muestra: LecturaMagnetica = { x: lectura.x, y: lectura.y, z: lectura.z };
        const actualizado = actualizarFiltroMagnetico(filtroMag, muestra);
        if (actualizado.invalidarFlecha) {
          // Una lectura mala suelta no apaga la flecha: esperamos varias seguidas.
          lecturasMalas += 1;
          if (lecturasMalas < 5) return;
          filtroMag = null;
          magOk = false;
          marcarSenales();
          rumboTelRef.current = null;
          rotacionRef.current = null;
          setRotacion(null);
          setAvisos((prev) => ({
            ...prev,
            postura: CONSEJO_HORIZONTAL,
            calibracion: !lecturaMagneticaUsable(muestra) ? MENSAJE_SENSOR_NULO : CONSEJO_HORIZONTAL,
          }));
          return;
        }
        lecturasMalas = 0;
        filtroMag = actualizado.suave;
        magOk = true;
        marcarSenales();
        rumboTelRef.current = actualizado.rumbo;
        setAvisos((prev) => ({
          ...prev,
          postura: convieneMantenerHorizontal(muestra) ? CONSEJO_HORIZONTAL : null,
          calibracion: campoMagneticoDudoso(muestra)
            ? 'La brújula parece descalibrada o hay interferencia. Mové el teléfono en forma de ocho.'
            : null,
        }));
        if (gpsOk) {
          setError(null);
          setCargando(false);
        }
        publicarRotacion();
      });
      magEsta = magNueva;
      if (vigente()) {
        magSub.current = magNueva;
      } else {
        magNueva.remove();
        magEsta = null;
        return;
      }

      esperaTimer = setTimeout(avisarFaltaSenal, MS_ESPERA_SENAL);

      gpsAgeTimer = setInterval(() => {
        if (!vigente()) return;
        if (hayQueInvalidarGps(ultimoFixVivoMs, Date.now())) {
          invalidarGpsVivoVencido();
        }
      }, INTERVALO_EDAD_GPS_MS);

      void resolverWatchSiVigente(
        Location.watchPositionAsync(OPCIONES_GPS, (posicion) => aplicarPosicion(posicion, true)),
        vigente,
      ).then(({ sub, fallo }) => {
        if (sub) adoptarGps(sub);
        if (fallo && vigente() && !gpsOk) {
          setAvisos((prev) => ({
            ...prev,
            precision: prev.precision ?? MENSAJE_SIN_FIX,
          }));
        }
      });

      const conocida = await Location.getLastKnownPositionAsync().catch(() => null);
      if (!vigente()) return;
      if (conocida) aplicarPosicion(conocida, false);

      void Location.getCurrentPositionAsync(OPCIONES_GPS)
        .then((actual) => {
          if (vigente()) aplicarPosicion(actual, true);
        })
        .catch(() => {});
    }

    void arrancar().catch(() => {
      if (!vigente()) return;
      setError(MENSAJE_SIN_BRUJULA);
      setCargando(false);
    });

    return () => {
      cancelado = true;
      soltarEstaSesion();
    };
  }, [activa, ciclo, enFoco, appActiva, paradaId, destino?.latitud, destino?.longitud, publicarRotacion]);

  function orientar() {
    setError(null);
    setActiva(true);
    setCiclo((n) => n + 1);
  }

  function detener() {
    setActiva(false);
    setCargando(false);
    rumboDestinoRef.current = null;
    rumboTelRef.current = null;
    rotacionRef.current = null;
    setRotacion(null);
  }

  return {
    activa,
    cargando,
    error,
    rotacion,
    distancia,
    enLaParada,
    senales,
    avisos,
    orientar,
    detener,
    reintentar: orientar,
  };
}

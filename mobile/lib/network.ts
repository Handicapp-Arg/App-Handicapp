import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { onlineManager, focusManager } from '@tanstack/react-query';
import { AppState, type AppStateStatus } from 'react-native';

/**
 * Conexión de red para toda la app.
 *
 * Esta app se usa en el campo, donde la señal se corta seguido. Sin esto,
 * react-query asume que siempre hay internet: reintenta contra el vacío y las
 * pantallas quedan mostrando "no hay datos" cuando en realidad no hay señal.
 *
 * `configurarRed()` se llama una vez al arrancar y hace dos cosas: le avisa a
 * react-query si hay conexión (para que pause y reanude solo), y le avisa
 * cuando la app vuelve del segundo plano (para refrescar lo que quedó viejo).
 */
export function configurarRed() {
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => {
      setOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
    })
  );

  const onAppState = (status: AppStateStatus) => focusManager.setFocused(status === 'active');
  const sub = AppState.addEventListener('change', onAppState);
  return () => sub.remove();
}

/** `true` cuando el teléfono se quedó sin conexión utilizable. */
export function useSinConexion() {
  const [sinConexion, setSinConexion] = useState(false);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      setSinConexion(!(state.isConnected && state.isInternetReachable !== false));
    });
    return () => unsub();
  }, []);

  return sinConexion;
}

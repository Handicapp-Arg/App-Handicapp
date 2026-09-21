import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Linking, ActivityIndicator } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import Animated, {
  FadeIn, useAnimatedStyle, useSharedValue, withRepeat, withTiming,
} from 'react-native-reanimated';
import { X, QrCode, ScanLine, Lightbulb, ChevronRight } from 'lucide-react-native';

import { haptic } from '../lib/haptics';
import { Routes, nav } from '../lib/routes';
import { getItemAsync, setItemAsync } from '../lib/secure-storage';
import { AUTH_DARK } from '../components/auth-dark';
import { PressableScale } from '../components/PressableScale';
import { space, text, radius, weight, touch } from '../styles/tokens';
import { duration, easing } from '../styles/motion';
import api from '../lib/api';

// El QR de cada caballo apunta a la web pública: https://app.handicapp.com.ar/caballo/{public_token}
// Acá extraemos el token y navegamos a la ficha del caballo dentro de la app.
const TOKEN_FROM_URL = /\/caballo\/([a-zA-Z0-9_-]+)\/?$/;

function extraerToken(data: string): string | null {
  const match = data.match(TOKEN_FROM_URL);
  return match ? match[1] : null;
}

/** El último caballo escaneado sobrevive al cierre de la app: volver a entrar
 *  al escáner casi siempre es para volver al mismo caballo. */
const ULTIMO_KEY = 'escaner-ultimo-caballo';
type Ultimo = { id: string; name: string };

const LADO = 248;        // lado del cuadro de mira
const ESQUINA = 46;      // largo del brazo de cada esquina
const RECORRIDO = 210;   // cuánto viaja la línea de barrido dentro del cuadro

/**
 * El escáner no sigue el tema claro/oscuro: es una pantalla de cámara y vive
 * siempre en el mundo oscuro de la marca, el mismo de auth. Por eso los colores
 * salen de `AUTH_DARK` y no de `useTheme()`: sobre la imagen de la cámara, el
 * verde profundo de día no se ve.
 */
const VIDRIO = 'rgba(243,240,233,0.14)';   // botón de vidrio sobre la cámara
const PANEL = 'rgba(21,20,15,0.72)';       // panel inferior sobre la cámara

export default function EscanearScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [permission, requestPermission] = useCameraPermissions();
  const [error, setError] = useState('');
  const [linterna, setLinterna] = useState(false);
  const [ultimo, setUltimo] = useState<Ultimo | null>(null);
  const procesadoRef = useRef(false);
  const [resolviendo, setResolviendo] = useState(false);

  // Barrido continuo de arriba a abajo. `true` en el reverse hace que baje y
  // suba con la misma curva, sin el salto que deja reiniciar la animación.
  const barrido = useSharedValue(0);
  useEffect(() => {
    barrido.value = withRepeat(
      withTiming(1, { duration: 2600, easing: easing.inOutCirc }),
      -1,
      true,
    );
  }, []);
  const lineaStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: barrido.value * RECORRIDO }],
  }));

  useEffect(() => {
    getItemAsync(ULTIMO_KEY)
      .then((v) => { if (v) setUltimo(JSON.parse(v) as Ultimo); })
      .catch(() => {});
  }, []);

  // Al volver a enfocar la pantalla (ej. después de un QR inválido) rehabilitamos el escaneo.
  useFocusEffect(
    useCallback(() => {
      procesadoRef.current = false;
      setError('');
    }, [])
  );

  const cerrar = () => {
    haptic.light();
    if (router.canGoBack()) router.back();
    else nav.replace(router, Routes.mas);
  };

  const handleBarcodeScanned = async (result: BarcodeScanningResult) => {
    if (procesadoRef.current) return;

    const token = extraerToken(result.data);
    if (!token) {
      procesadoRef.current = true;
      haptic.error();
      setError('Ese código QR no pertenece a HandicApp');
      return;
    }

    procesadoRef.current = true;
    haptic.success();
    setError('');

    // El QR lleva el `public_token`, pero la ficha se abre por el id interno.
    // El endpoint público traduce uno en otro y no necesita sesión, así que
    // también sirve para un caballo de otra organización.
    setResolviendo(true);
    try {
      const { data } = await api.get(`/horses/public/${token}`);
      const horse = data?.horse ?? data;
      const horseId = horse?.id;
      if (!horseId) throw new Error('sin id');
      if (horse?.name) {
        void setItemAsync(ULTIMO_KEY, JSON.stringify({ id: horseId, name: horse.name })).catch(() => {});
      }
      nav.replace(router, Routes.caballo(horseId));
    } catch {
      haptic.error();
      setError('No encontramos ese caballo. Puede que el código ya no sea válido.');
    } finally {
      setResolviendo(false);
    }
  };

  const reintentar = () => {
    haptic.light();
    procesadoRef.current = false;
    setError('');
    setResolviendo(false);
  };

  const alternarLinterna = () => { haptic.selection(); setLinterna((v) => !v); };

  const abrirUltimo = () => {
    if (!ultimo) return;
    haptic.light();
    nav.replace(router, Routes.caballo(ultimo.id));
  };

  const concedido = !!permission?.granted;

  return (
    <View style={s.root}>
      <StatusBar style="light" />

      {concedido && (
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          enableTorch={linterna}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={handleBarcodeScanned}
        />
      )}

      {/* Velo: baja el contraste de la imagen para que el cuadro y los textos
          se lean sobre cualquier fondo que esté mirando la cámara. */}
      <View style={s.velo} pointerEvents="none" />

      <View style={[s.barra, { paddingTop: insets.top + space[3] }]} pointerEvents="box-none">
        <PressableScale
          style={s.botonVidrio}
          onPress={cerrar}
          accessibilityRole="button"
          accessibilityLabel="Cerrar el escáner"
        >
          <BlurView intensity={28} tint="dark" style={StyleSheet.absoluteFill} />
          <X size={20} color={AUTH_DARK.text} strokeWidth={2.1} />
        </PressableScale>

        {concedido && (
          <PressableScale
            style={[s.botonVidrio, linterna && s.botonVidrioOn]}
            onPress={alternarLinterna}
            accessibilityRole="button"
            accessibilityLabel={linterna ? 'Apagar la luz' : 'Encender la luz'}
            accessibilityState={{ selected: linterna }}
          >
            {!linterna && <BlurView intensity={28} tint="dark" style={StyleSheet.absoluteFill} />}
            <Lightbulb size={20} color={linterna ? AUTH_DARK.bg : AUTH_DARK.text} strokeWidth={1.9} />
          </PressableScale>
        )}
      </View>

      {concedido ? (
        <View style={s.centro} pointerEvents="box-none">
          <View style={s.mira}>
            <View style={[s.esquina, s.esquinaTL]} />
            <View style={[s.esquina, s.esquinaTR]} />
            <View style={[s.esquina, s.esquinaBL]} />
            <View style={[s.esquina, s.esquinaBR]} />
            <Animated.View style={[s.linea, lineaStyle]} />
          </View>

          {resolviendo ? (
            <View style={s.mensaje}>
              <ActivityIndicator color={AUTH_DARK.brand} />
              <Text style={s.mensajeTitulo}>Buscando el caballo…</Text>
            </View>
          ) : error ? (
            <View style={s.mensaje}>
              <Text style={s.mensajeError}>{error}</Text>
              <PressableScale style={s.botonClaro} onPress={reintentar} accessibilityRole="button">
                <Text style={s.botonClaroTexto}>Volver a intentar</Text>
              </PressableScale>
            </View>
          ) : (
            <View style={s.mensaje}>
              <Text style={s.mensajeTitulo}>Apuntá al QR del caballo</Text>
              <Text style={s.mensajeSub}>Se abre su ficha, aunque no sea tuyo.</Text>
            </View>
          )}
        </View>
      ) : (
        <View style={s.permiso}>
          <View style={s.permisoIcono}>
            {permission && !permission.canAskAgain
              ? <QrCode size={38} color={AUTH_DARK.text} strokeWidth={1.5} />
              : <ScanLine size={38} color={AUTH_DARK.text} strokeWidth={1.5} />}
          </View>
          <Text style={s.permisoTitulo}>
            {permission && !permission.canAskAgain ? 'Cámara desactivada' : 'Escanear un QR'}
          </Text>
          <Text style={s.permisoTexto}>
            {permission && !permission.canAskAgain
              ? 'Para leer el código de un caballo, activá el permiso de cámara en Ajustes.'
              : 'HandicApp necesita la cámara para leer el código QR de la ficha de un caballo.'}
          </Text>
          <PressableScale
            style={s.botonClaro}
            onPress={() => (permission && !permission.canAskAgain ? Linking.openSettings() : requestPermission())}
            accessibilityRole="button"
          >
            <Text style={s.botonClaroTexto}>
              {permission && !permission.canAskAgain ? 'Abrir Ajustes' : 'Permitir cámara'}
            </Text>
          </PressableScale>
        </View>
      )}

      {concedido && ultimo && (
        <Animated.View
          entering={FadeIn.duration(duration.enter).easing(easing.outQuart.factory())}
          style={[s.pie, { paddingBottom: insets.bottom + space[5] }]}
        >
          <PressableScale
            style={s.ultimo}
            onPress={abrirUltimo}
            accessibilityRole="button"
            accessibilityLabel={`Abrir la ficha de ${ultimo.name}`}
          >
            <View style={s.ultimoInicial}>
              <Text style={s.ultimoInicialTexto}>{ultimo.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.ultimoEtiqueta}>El último que escaneaste</Text>
              <Text style={s.ultimoNombre} numberOfLines={1}>{ultimo.name}</Text>
            </View>
            <ChevronRight size={17} color={AUTH_DARK.textMuted} strokeWidth={2.2} />
          </PressableScale>
        </Animated.View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: AUTH_DARK.bg },
  velo: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10,10,8,0.42)' },

  barra: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space[4],
  },
  botonVidrio: {
    width: touch.min,
    height: touch.min,
    borderRadius: radius.thumb,
    backgroundColor: VIDRIO,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  botonVidrioOn: { backgroundColor: AUTH_DARK.text },

  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[8] },

  mira: { width: LADO, height: LADO },
  esquina: { position: 'absolute', width: ESQUINA, height: ESQUINA, borderColor: AUTH_DARK.brand },
  esquinaTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: radius.card },
  esquinaTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: radius.card },
  esquinaBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: radius.card },
  esquinaBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: radius.card },
  linea: {
    position: 'absolute',
    top: space[5],
    left: space[3] + 2,
    right: space[3] + 2,
    height: 2,
    backgroundColor: AUTH_DARK.brand,
    shadowColor: AUTH_DARK.brand,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 12,
  },

  mensaje: { alignItems: 'center', gap: space[2], paddingHorizontal: space[10] },
  mensajeTitulo: { fontSize: text.lg - 2, fontWeight: weight.semibold, color: AUTH_DARK.text, textAlign: 'center' },
  mensajeSub: { fontSize: text.base, color: AUTH_DARK.textMuted, textAlign: 'center', lineHeight: 21 },
  mensajeError: { fontSize: text.base, fontWeight: weight.semibold, color: AUTH_DARK.danger, textAlign: 'center' },

  botonClaro: {
    marginTop: space[3],
    height: touch.button,
    paddingHorizontal: space[8],
    borderRadius: radius.button,
    backgroundColor: AUTH_DARK.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonClaroTexto: { fontSize: text.md, fontWeight: weight.semibold, color: AUTH_DARK.bg },

  permiso: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space[6], gap: space[3] },
  permisoIcono: {
    width: 76, height: 76, borderRadius: radius.card,
    backgroundColor: VIDRIO, alignItems: 'center', justifyContent: 'center', marginBottom: space[2],
  },
  permisoTitulo: { fontSize: text.xl, fontWeight: weight.bold, color: AUTH_DARK.text, letterSpacing: -0.6, textAlign: 'center' },
  permisoTexto: { fontSize: text.md, color: AUTH_DARK.textMuted, textAlign: 'center', lineHeight: 24 },

  pie: { paddingHorizontal: space[4] },
  ultimo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    backgroundColor: PANEL,
    borderRadius: radius['2xl'],
    padding: space[3] + 2,
  },
  ultimoInicial: {
    width: 46, height: 46, borderRadius: radius.thumb, backgroundColor: VIDRIO,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  ultimoInicialTexto: { fontSize: text.md, fontWeight: weight.bold, color: AUTH_DARK.text },
  ultimoEtiqueta: { fontSize: text.sm, color: AUTH_DARK.textMuted },
  ultimoNombre: { fontSize: text.md, fontWeight: weight.semibold, color: AUTH_DARK.text, marginTop: 2 },
});

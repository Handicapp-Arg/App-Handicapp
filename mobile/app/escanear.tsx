import { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking , ActivityIndicator } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { X, QrCode, ScanLine } from 'lucide-react-native';
import { haptic } from '../lib/haptics';
import { Routes, nav } from '../lib/routes';
import { useTheme, type ThemeColors } from '../lib/theme';
import { space, text, radius, weight } from '../styles/tokens';
import api from '../lib/api';

// El QR de cada caballo apunta a la web pública: https://app.handicapp.com.ar/caballo/{public_token}
// Acá extraemos el token y navegamos a la ficha del caballo dentro de la app.
const TOKEN_FROM_URL = /\/caballo\/([a-zA-Z0-9_-]+)\/?$/;

function extraerToken(data: string): string | null {
  const match = data.match(TOKEN_FROM_URL);
  return match ? match[1] : null;
}

export default function EscanearScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const s = makeStyles(c);

  const [permission, requestPermission] = useCameraPermissions();
  const [error, setError] = useState('');
  const procesadoRef = useRef(false);
  const [resolviendo, setResolviendo] = useState(false);

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
      const horseId = data?.horse?.id ?? data?.id;
      if (!horseId) throw new Error('sin id');
      nav.replace(router, Routes.caballo(horseId));
    } catch {
      haptic.error();
      setError('No encontramos ese caballo. Puede que el código ya no sea válido.');
    } finally {
      setResolviendo(false);
    }
  };

  const reintentar = () => {
    procesadoRef.current = false;
    setError('');
    setResolviendo(false);
  };

  return (
    <View style={s.root}>
      {permission?.granted && (
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={handleBarcodeScanned}
        />
      )}

      <TouchableOpacity
        style={[s.closeBtn, { top: insets.top + space[3] }]}
        onPress={cerrar}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Cerrar escáner"
        hitSlop={8}
      >
        <X size={22} color="#fff" strokeWidth={2.5} />
      </TouchableOpacity>

      {permission?.granted ? (
        <View style={s.overlay} pointerEvents="box-none">
          <View style={s.frameWrap}>
            <View style={s.frame}>
              <View style={[s.corner, s.cornerTL]} />
              <View style={[s.corner, s.cornerTR]} />
              <View style={[s.corner, s.cornerBL]} />
              <View style={[s.corner, s.cornerBR]} />
            </View>
          </View>

          {resolviendo ? (
            <View style={s.messageWrap}>
              <ActivityIndicator color="#fff" />
              <Text style={s.helpText}>Buscando el caballo…</Text>
            </View>
          ) : error ? (
            <View style={s.messageWrap}>
              <Text style={s.errorText}>{error}</Text>
              <TouchableOpacity style={s.retryBtn} onPress={reintentar} activeOpacity={0.8}>
                <Text style={s.retryBtnText}>Volver a intentar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.messageWrap}>
              <Text style={s.helpText}>Apuntá al código QR del caballo</Text>
            </View>
          )}
        </View>
      ) : permission && !permission.granted && !permission.canAskAgain ? (
        <View style={s.permisoWrap}>
          <View style={s.permisoIcon}>
            <QrCode size={40} color="#fff" strokeWidth={1.5} />
          </View>
          <Text style={s.permisoTitulo}>Cámara desactivada</Text>
          <Text style={s.permisoTexto}>
            Para escanear el código QR de un caballo, activá el permiso de cámara en Ajustes.
          </Text>
          <TouchableOpacity
            style={s.permisoBtn}
            onPress={() => Linking.openSettings()}
            activeOpacity={0.85}
          >
            <Text style={s.permisoBtnText}>Abrir Ajustes</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={s.permisoWrap}>
          <View style={s.permisoIcon}>
            <ScanLine size={40} color="#fff" strokeWidth={1.5} />
          </View>
          <Text style={s.permisoTitulo}>Escanear código QR</Text>
          <Text style={s.permisoTexto}>
            HandicApp necesita acceder a la cámara para leer el código QR de la ficha pública de un caballo.
          </Text>
          <TouchableOpacity
            style={s.permisoBtn}
            onPress={() => requestPermission()}
            activeOpacity={0.85}
          >
            <Text style={s.permisoBtnText}>Permitir cámara</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const FRAME_SIZE = 260;

const makeStyles = (_c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },

  closeBtn: {
    position: 'absolute',
    left: space[4],
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frameWrap: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
  },
  frame: {
    flex: 1,
  },
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: '#fff',
  },
  cornerTL: { top: 0, left: 0, borderLeftWidth: 3, borderTopWidth: 3, borderTopLeftRadius: radius.md },
  cornerTR: { top: 0, right: 0, borderRightWidth: 3, borderTopWidth: 3, borderTopRightRadius: radius.md },
  cornerBL: { bottom: 0, left: 0, borderLeftWidth: 3, borderBottomWidth: 3, borderBottomLeftRadius: radius.md },
  cornerBR: { bottom: 0, right: 0, borderRightWidth: 3, borderBottomWidth: 3, borderBottomRightRadius: radius.md },

  messageWrap: {
    position: 'absolute',
    bottom: space[16],
    left: space[6],
    right: space[6],
    alignItems: 'center',
    gap: space[3],
  },
  helpText: {
    fontSize: text.sm,
    fontWeight: weight.medium,
    color: '#fff',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: space[4],
    paddingVertical: space[2],
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  errorText: {
    fontSize: text.sm,
    fontWeight: weight.semibold,
    color: '#fff',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: space[4],
    paddingVertical: space[2],
    borderRadius: radius.md,
  },
  retryBtn: {
    backgroundColor: '#fff',
    borderRadius: radius.full,
    paddingHorizontal: space[5],
    paddingVertical: space[2] + 2,
  },
  retryBtnText: {
    fontSize: text.sm,
    fontWeight: weight.bold,
    color: '#111',
  },

  permisoWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space[6],
    gap: space[3],
  },
  permisoIcon: {
    width: 76,
    height: 76,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space[2],
  },
  permisoTitulo: {
    fontSize: text.xl,
    fontWeight: weight.bold,
    color: '#fff',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  permisoTexto: {
    fontSize: text.md,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    lineHeight: 24,
  },
  permisoBtn: {
    marginTop: space[4],
    backgroundColor: '#fff',
    borderRadius: radius.full,
    height: 56,
    paddingHorizontal: space[8],
    alignItems: 'center',
    justifyContent: 'center',
  },
  permisoBtnText: {
    fontSize: text.md,
    fontWeight: weight.bold,
    color: '#111',
  },
});

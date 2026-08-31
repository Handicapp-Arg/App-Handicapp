# Pasar HandicApp a TestFlight — checklist

> Estado al 31/08/2026. El código está listo; lo que falta es operativo.

## 0. Prerrequisitos (bloqueantes, en orden)

- [ ] **VPS vivo** (`https://app.handicapp.com.ar/api/roles` responde).
      Está caído desde el 30/08 a la noche. Se revive desde el panel del
      proveedor. ⚠️ En el mismo VPS corre la mutual (Las Marías): nginx
      compartido por `server_name` y su Postgres en Docker en el puerto 5432.
      Nuestro deploy (`bash update-vps.sh`) NO los toca — solo hace git pull en
      `/opt/handicapp` y reinicia los pm2 `handicapp-api` / `handicapp-web`.
- [ ] **Deploy pendiente**: `bash update-vps.sh` (ya commiteado en GitHub:
      badge de notificaciones, deep links AASA, push-token null, Cloudinary
      con error claro).
- [ ] **Cloudinary**: cargar en `/opt/handicapp/backend/.env` →
      `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
      (cuenta gratis en cloudinary.com) y `pm2 restart handicapp-api`.
      Sin esto NO suben fotos ni documentos en toda la app.
- [ ] **Política de privacidad**: completar razón social, domicilio y email en
      `frontend/src/app/privacidad/page.tsx:23` y redeployar la web.
      Apple la revisa a mano; con placeholders es rechazo directo.

## 1. Crear la app en App Store Connect (una sola vez, ~10 min)

1. https://appstoreconnect.apple.com → entrar con `alejo_maros@hotmail.com`.
2. **Mis apps → ＋ → Nueva app**:
   - Plataforma: iOS
   - Nombre: `HandicApp`
   - Idioma principal: Español (México o España, el que ofrezca)
   - ID del paquete: `com.handicapp.app` (ya registrado por EAS)
   - SKU: `handicapp` (interno, cualquier cosa sirve)
3. No hace falta completar nada más para TestFlight interno.

## 2. Compilar y subir

```bash
cd mobile
# build de producción (canal "production", autoincrementa el build number)
npx eas-cli build --profile production --platform ios
# cuando termina, subir a App Store Connect:
npx eas-cli submit --platform ios --latest
```

- `eas.json` ya tiene precargados `appleId` y `appleTeamId` para el submit.
- El submit pide una **app-specific password**: se genera en
  https://account.apple.com → Inicio de sesión y seguridad → Contraseñas de app.
- Primera subida: en App Store Connect puede preguntar por cifrado — ya está
  declarado en el código (`ITSAppUsesNonExemptEncryption: false`), no debería.

## 3. Invitar testers

- **Internos** (hasta 100, sin revisión de Apple, disponible al instante):
  App Store Connect → Usuarios y acceso → agregar por email → luego en
  TestFlight → agregar al grupo interno.
- **Externos** (amigos, hasta 10.000): TestFlight → grupo externo → agregar
  emails o crear un **enlace público**. La primera build externa pasa por la
  *beta review* de Apple (suele salir en 24–48 h).

Los testers instalan la app **TestFlight** del App Store y aceptan la
invitación. Listo.

## 4. Después de publicar la build

- Los cambios de JS/TS siguen saliendo por OTA:
  `npm run update:preview` publica al canal `preview` (la build ad-hoc actual).
  Para la build de TestFlight (canal `production`) es igual pero con
  `--branch production`; conviene duplicar el script como `update:production`.
- Cambios nativos (permisos, librerías, ícono) = nueva build + nuevo submit.

## Pendientes conocidos NO bloqueantes para TestFlight

- Sentry (monitoreo de crashes): recomendado antes de testers externos.
- Usuarios demo en producción: mantenerlos mientras prueben amigos; **quitarlos
  antes del lanzamiento público** (`SEED_DEMO=false` + limpiar usuarios).
- Android: sin circuito de updates (el bundle web revienta `EMFILE` en Windows
  con `--platform all`; por eso los scripts publican solo iOS).
- Gesto de arrastre de las hojas: validar en el dispositivo el botón X del
  FormSheet (posición estimada sin simulador).

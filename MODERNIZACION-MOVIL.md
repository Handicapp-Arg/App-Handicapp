# Modernización de la app móvil — HandicApp

> Trabajo autónomo nocturno. Objetivo: app **fina y moderna** (inspirada en apps actuales), no rústica. Íconos modernos, movimiento sutil, skeletons, cuero solo como acento.

Fecha: 2026-06-24 (noche).

---

## 1. Iconografía → Lucide
- **~115 íconos** migrados de **Ionicons** (cuadrados, "viejos") a **Lucide** (línea fina, redondeada, estilo Instagram/Linear) en las **20 pantallas** + componentes compartidos.
- Hecho con 6 agentes en paralelo + resolución manual de los sin equivalente directo (médico→Stethoscope, género→Mars/Venus, pedigrí→Network, etc.).
- **Íconos propios mantenidos**: el **caballo** (Phosphor, línea) en la tab Caballos y el **isotipo de marca** (herradura+H) en la tab Muro.
- `EmptyState` migrado con un mapa interno (string→Lucide) + fallback, sin tocar sus 9 pantallas.

## 2. Animaciones sutiles
- **Listas**: todas las listas de la app (caballos, agenda, eventos, remates, padrón, buscar, notificaciones, solicitudes, organización, directorio, contratos, perfil, más, facturación, superadmin, muro) entran con **`FadeInDown`** escalonado (cascada suave) — `duration 320ms`, `delay` por índice.
- **Modales / sheets**: los bottom-sheets suben **deslizando** (`animationType="slide"`) en vez de aparecer de golpe — incl. el selector "Etiquetar caballo".
- **EmptyState**: las pantallas vacías aparecen con un fade hacia arriba.
- **Login**: el logo aparece con fade y la card sube suave al abrir la app.
- Principio: **sutil, suave, nunca brusco**.

## 3. Skeletons (carga)
- `components/Skeleton.tsx` reescrito con **shimmer** (un brillo que se desliza, estilo apps modernas) en vez del "pulse" anterior.
- Nuevos: `ListRowSkeleton`, `PostSkeleton` (+ los existentes `HorseCardSkeleton`, `EventRowSkeleton`, `HomeSkeleton`).
- Aplicados en los **estados de carga principales** de toda la app (reemplazando los spinners). Se mantuvieron los spinners de "cargar más", refresh y botones.

## 4. Componentes nuevos reutilizables
- **`PressableScale`** — botón/tarjeta que se "hunde" levemente al tocar (micro-interacción spring). Listo para usar en los próximos rediseños de tarjetas.
- **`Skeleton`** con shimmer.

## 5. Criterio de color (guardado en memoria)
- **Cuero (`#9d6c35`) solo como acento puntual**, nunca como relleno. Mayoría neutra (gris/blanco). Como las apps globales (Instagram, WhatsApp, Airbnb). Ver `feedback_color_moderacion`.

## 6. Correcciones
- `contratos.tsx`: el skeleton de carga usaba `contracts?.length` (TS lo infería `never`) → cambiado a `pending`/`others` (arrays seguros).
- Varios imports de Ionicons eliminados donde quedaron sin uso.
- Pantalla de prueba `iconos-demo.tsx` eliminada.

## 7. Verificación
- **Type-check**: limpio en todos los pasos (último consolidado: SIN ERRORES).
- **Validación visual** (agente, 17 rutas, 390×844): **TODO OK**. Cero pantallas en blanco, cero error-overlays, cero errores de render/JS, **cero íconos Lucide faltantes**, cero errores de Reanimated. Layouts intactos tras las animaciones. Todas las pantallas con datos reales después del login.
- **Único hallazgo (menor, ajeno al rediseño)**: en la primerísima carga del preview web aparecen 2 `401` transitorios contra `192.168.0.58:3001` (la IP LAN del backend) antes de inyectar el token. No afecta el celular real (que sí usa esa IP). Si se quiere QA web sin esa ventana, conviene que el cliente apunte a `localhost` en web.

## Estado final
App móvil **modernizada de punta a punta**: íconos Lucide, movimiento sutil en todas las listas y modales, skeletons con shimmer, login animado — sin nada roto y con type-check limpio. Lista para la demo.

**Disponible para próximos rediseños:** `PressableScale` (micro-interacción "tap que hunde") — pensado para aplicar a las tarjetas cuando se rediseñe cada pantalla (ej. la lista de Caballos que quedó pendiente de rediseño).

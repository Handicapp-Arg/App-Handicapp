# Auditoría y mejora de la app móvil — HandicApp

> Trabajo autónomo nocturno. Objetivo: que **todo funcione**, **nada roto**, **nada hardcodeado/mock**, y la **UI/UX** consistente con la marca cuero.

Fecha de inicio: 2026-06-24 (madrugada).

---

## 1. Metodología

- **3 agentes de auditoría de código** en paralelo (pantallas tab, pantallas secundarias, capa de datos/componentes).
- **1 agente de validación visual** recorriendo cada pantalla en el navegador (móvil-web :8081): render, consola, layout, paleta.
- **Type-check** (`tsc --noEmit`) de todo el móvil.
- Corrección manual + re-validación.

---

## 2. Diagnóstico (resultado de la auditoría)

### 🟢 Lo que estaba SANO
- **0 roturas de código**: ningún estilo usado sin definir, ninguna variable/función sin resolver, JSX balanceado, imports válidos en las ~33 pantallas/componentes auditados.
- **0 datos mock / hardcodeados**: los **21 hooks** consultan el backend real vía `api` (axios). No hay arrays "fake", ni `return [{...}]` simulado, ni URLs/tokens quemados. Las constantes tipo `APPOINTMENT_TYPES`, `STATUS_META`, `ROLE_LABELS` son mapas de presentación (label/ícono), legítimos.
- **0 funcionalidad muerta**: sin `onPress={() => {}}` vacíos, sin TODO/FIXME, sin "próximamente", sin `console.log`. Todo conecta a navegación o mutaciones reales.
- **Type-check**: solo **1 error** en todo el móvil (prop `pointerEvents` en `<Image>`).

### 🟡 El hallazgo dominante: PALETA a medias
La migración a la marca **cuero** (`colors.brand #9d6c35`) estaba hecha solo en las pantallas rediseñadas (muro, caballos). El resto de pantallas y **componentes compartidos** seguían en **navy** (`colors.primary #0f1f3d`) y con violetas/azules hardcodeados.

### Notas (no bugs, decisiones)
- `push-notifications` y badge sync están como no-op a propósito (Expo Go no soporta push sin development build).
- `directorio.tsx` usa un debounce con `global.__dirTimer` (antipatrón, frágil) — funcional, deuda menor.
- Pantallas de remates duplicadas (`/remates/index` y `/(tabs)/remates`) — riesgo de mantenimiento.

---

## 3. Correcciones aplicadas

| # | Qué | Archivos |
|---|-----|----------|
| 1 | **Fix type-check**: `pointerEvents` movido de prop a `style` | `(auth)/login.tsx` |
| 2 | **Viraje masivo navy → cuero**: todos los `colors.primary` → `colors.brand` (con word-boundary, sin tocar `primaryLight`) en TODAS las pantallas y componentes del móvil | `app/**`, `components/**` |
| 3 | **EventCard**: monto en violeta (`purple700`) → cuero | `components/EventCard.tsx` |
| 4 | **Header oscuro** (`ScreenHeader` dark): cuero medio → **espresso** (buen contraste con texto blanco) | `components/ScreenHeader.tsx` |
| 5 | **Registro y Recuperar contraseña**: fondo cuero medio → **espresso** (coherente con el login) | `(auth)/registro.tsx`, `(auth)/olvide-contrasena.tsx` |

---

## 4. Validación visual (agente recorriendo el móvil-web, 21 rutas)

Resultado: **ninguna pantalla en blanco ni con error overlay.** Layout sólido. Problemas detectados (todos de paleta o funcionales menores), y **corregidos**:

| # | Problema detectado | Corrección | Archivos |
|---|---|---|---|
| 6 | Íconos del menú de "Más" en arcoíris (azul/violeta/verde/rojo) | Quitados los 13 `iconColor` hardcodeados → todos usan el cuero por defecto | `(tabs)/mas.tsx` |
| 7 | Banner "¿Querés vender?" en violeta | Todos los violetas → cuero | `(tabs)/mas.tsx` |
| 8 | Badge de tipo "Gasto" en violeta (en eventos, detalle, EventCard) | `eventTypeColors.gasto` → cuero | `lib/colors.ts` |
| 9 | **Chips de filtro invisibles en Eventos** (blanco sobre fondo claro) | Fondo gris claro + borde más visible | `(tabs)/eventos.tsx` |
| 10 | Ícono violeta en estado vacío de Facturación | violeta → cuero | `(tabs)/facturacion.tsx` |
| 11 | Categoría activa violeta en Eventos | violeta → cuero | `(tabs)/eventos.tsx` |
| 12 | Nodo "Sujeto" del árbol en navy, líneas paternas en azul | nodo → cuero, líneas paternas → cuero, textos → claro | `arbol.tsx` |
| 13 | Avatar de veterinarios y otros azules en detalle de caballo | azules → cuero | `(tabs)/caballos/[id].tsx` |
| 14 | **Errores 403 en consola**: Perfil y Superadmin llamaban endpoints de admin sin chequear rol | Hooks con `enabled` gateado por rol (`useAdminPlanUsers`, `useSuperAdminMetrics`, `useSuperAdminOrgs`) | `hooks/use-plan.ts`, `hooks/use-superadmin.ts`, `(tabs)/perfil.tsx`, `superadmin.tsx` |

## 5. Re-validación visual (2ª pasada del agente) + cierre

El agente re-verificó las pantallas corregidas leyendo los colores reales del DOM. Resultado: **/mas, /eventos, /facturación, /árbol, /perfil → todo cuero, 0 errores 403**. Quedaban violetas residuales, ahora **corregidos**:

| # | Problema | Corrección | Archivos |
|---|---|---|---|
| 15 | "TOTAL ACUMULADO" (tab Finanzas) en violeta | `purple700` → cuero | `(tabs)/caballos/[id].tsx`, `lib/colors.ts` |
| 16 | Fondo del banner "Publicar en venta" en lavanda | violeta → cuero crema | `(tabs)/caballos/[id].tsx` |
| 17 | Violetas residuales en Remates (badges tipo), Contratos (badge caballo), Notificaciones (íconos facturación), selector de tipo de evento, color muerto del tab Agenda | Pasada global de violetas hex → cuero | `remates*.tsx`, `contratos.tsx`, `notificaciones.tsx`, `_layout.tsx`, `caballos/[id].tsx` |
| 18 | **"Invalid Date"** en Últimos gastos (fecha sin validar; rompía con fechas que ya traían hora) | Parseo robusto con fallback (`isNaN` → reintento → "—") | `(tabs)/caballos/[id].tsx` (2 lugares) |

**Confirmado por captura**: detalle de caballo (tabs Info y Finanzas) 100% en cuero, fechas válidas ("01 de jun de 2026"), 0 errores de consola.

## 5c. Modales validados + botones comunes

Un agente abrió y revisó los **modales** del móvil (nuevo caballo, menú de acciones ···, QR, registrar evento, nuevo turno): **todos bien, en cuero, sin violetas, nada cortado**. Detectó un botón "Crear turno" en azul marino → raíz: el **botón primario común** (`styles/common.ts`) seguía en `colors.primary` (navy), porque el sweep inicial cubrió `app/` y `components/` pero no `styles/`.

| # | Qué | Archivos |
|---|---|---|
| 19 | Botón primario y link comunes navy → cuero (afecta "Crear turno" de Agenda y todos los CTAs que usan el estilo común) | `styles/common.ts` |

## 5b. Estado final
- **Type-check**: limpio. Los errores que surgieron durante el trabajo (`pointerEvents` en `<Image>`, `user` posiblemente null) fueron corregidos.
- **Paleta**: unificada a cuero en TODA la app móvil (pantallas + componentes compartidos). Cero violetas hex. Se mantienen colores semánticos legítimos: rojo (salud/eliminar/like), ámbar (carrera/pendiente/entrenamiento), verde (verificado/completado), rosa (línea materna del árbol), azul (tipo "Directo" en remates, para distinguir de "Remate").
- **Funcionalidad**: sin requests inútiles de admin para no-admins; sin "Invalid Date".

## 6. Pendientes menores (baja prioridad, no rotos)
- `registro.tsx`: logo es un cuadrado "H" en vez del logo real (login usa el logo Cloudinary). Inconsistencia visual menor.
- `olvide-contrasena.tsx`: la card queda un poco baja/centrada sin logo arriba.
- `directorio.tsx`: debounce con `global.__dirTimer` (antipatrón, funcional).
- Remates duplicados (`/remates/index` y `/(tabs)/remates`) — unificar para mantenimiento.
- Estilos huérfanos en varios archivos (definidos sin usar) — limpieza opcional, no rompen.
- Push notifications / badge sync: no-op intencional (Expo Go; requieren development build).

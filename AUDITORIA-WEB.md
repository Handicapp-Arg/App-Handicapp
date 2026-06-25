# Auditoría y mejora de la app web — HandicApp

> Trabajo autónomo nocturno. Frontend Next.js 16 + Tailwind v4. Objetivo: que **todo funcione**, **nada roto**, **nada hardcodeado/mock**, UI/UX consistente con la marca cuero.

Fecha: 2026-06-24 (madrugada).

---

## 1. Metodología
- **2 agentes de auditoría de código** en paralelo (páginas del dashboard + componentes/hooks).
- **Type-check** (`tsc --noEmit`) de todo el frontend.
- Corrección + re-verificación.

## 2. Diagnóstico

### 🟢 Sano
- **0 roturas de build**: todos los imports resuelven (verificado `cn`, tokens `navy/slate/danger/success/info/gold`), JSX balanceado en los 24 `page.tsx` y 41 componentes (incluido uno de 2779 líneas).
- **0 datos mock/hardcodeados**: los **26 hooks** pegan al backend real vía `api` (axios + react-query), con optimistic updates y rollback. Las constantes (labels, categorías, opciones) son config de UI legítima.

### 🟡 Hallazgos
- **Paleta navy→clay (dominante)**: la marca es cuero (`--color-clay-500: #9d6c35`), pero muchas pantallas/componentes seguían en navy (`#0f1f3d` crudo y clases `navy-*`).
- **3 bugs funcionales reales** + código muerto.

## 3. Correcciones aplicadas

| # | Qué | Tipo | Archivos |
|---|-----|------|----------|
| 1 | **Fix type-check**: prop `user` del FeedSidebar sin `avatar_url`/`cover_url` | roto (build) | `(dashboard)/muro/page.tsx` |
| 2 | **Sweep navy → cuero**: `#0f1f3d`→`#9d6c35`, `#1a3366`/`#1e3a6e`/`#1a2f5a`→`#7f5628`, `#0a1628`→`#20160e` en **32 archivos** | paleta | `app/**`, `components/**` |
| 3 | **Fondos oscuros del navbar móvil** (header + drawer): cuero medio → marrón oscuro `#20160e` (contraste con texto blanco) | paleta | `components/layout/navbar.tsx` |
| 4 | **Foco de inputs** navy → cuero (`focus:border/ring-clay-500`) | paleta | `ui/input.tsx`, `ui/select.tsx`, `ui/textarea.tsx` |
| 5 | **BUG: el vendedor no podía aceptar pujas de un remate** — `onAccept` exigía `type === 'venta_directa'` dentro de un bloque que solo existe para remates → siempre `undefined`. Corregido a `auction.status === 'active'` | funcional | `(dashboard)/remates/[id]/page.tsx` |
| 6 | **Seguridad: credenciales de prueba** expuestas en el bundle de producción → gateadas a desarrollo (`NODE_ENV !== 'production'`); el botón "Acceso rápido" no aparece en prod | seguridad | `(auth)/login/page.tsx` |
| 7 | **Errores 403 en /padron**: queries admin (`stats`, `import-jobs`) se ejecutaban antes del gate de rol → gateadas con `enabled` por rol admin | funcional | `hooks/use-horse-records.ts`, `(dashboard)/padron/page.tsx` |

**Validación visual (agente, 7 rutas escritorio)**: login, muro, caballos, agenda, perfil, remates, padrón → **todas BIEN**, paleta cuero coherente, sidebar espresso, sin navy de tema, sin pantallas en blanco ni errores de Next.

## 4. Estado
- **Type-check**: limpio tras los cambios.
- **Paleta**: los navy hex crudos (lo más visible: bottom-nav, spinners, paginación, stat-cards, pedigree, modales) ahora en cuero.

## 5. Segunda pasada — pendientes resueltos (sesión 2026-06-24)

| # | Qué | Archivos |
|---|-----|----------|
| 8 | **BUG funcional: botón "Editar" del detalle de caballo** iba al listado → ahora navega a `/caballos?edit={id}` y la lista abre el modal de edición de ese caballo (efecto que lee el query param con `window.location` para no requerir `Suspense`). **Validado por captura**: abre "Editar caballo" con los datos correctos | `caballos/[id]/page.tsx`, `caballos/page.tsx` |
| 9 | **Paleta menor**: `text-navy-900` → `text-gray-900` en 13 archivos (títulos); rol "propietario" del feed azul → cuero (coherente con su avatar de perfil); botón "Comentar" activo azul → cuero | `**/*.tsx`, `feed/PostCard.tsx` |
| 10 | **Limpieza de código muerto**: debounce con `window.__directorioTimer` → `useRef`; variables `API_URL` sin usar (eventos, event-calendar); imports sin usar (`BillItem`, `SuperadminSkeleton`, `useAdminResolvePedigree`, `Eye`) | `directorio`, `eventos`, `event-calendar`, `facturacion`, `superadmin`, `PedigreeSection`, `remates` |

> Nota: las constantes `BTN_NAVY`/`BTN_NAVY_HOVER` ya tenían **valor cuero** (`#9d6c35`) tras el sweep — solo el nombre quedó (cosmético, no afecta lo visual).

## 6. Pendientes restantes (tu decisión / baja prioridad)
- `components/image-picker.tsx`: flujo multi-captura de cámara inalcanzable — **decidir** si se activa o se elimina (no elegido aún).
- `organizacion/page.tsx`: links de WhatsApp con número placeholder `5491100000000` (falta el número real).
- Colores de rol en el feed: establecimiento (verde), veterinario (violeta), admin (gris) — identidad por tipo de usuario; se mantienen salvo que quieras unificar todo a cuero.
- Panel superadmin con su propio DS navy/gold (admin-only).
- `.catch(()=>{})` que tragan errores en `perfil`/`solicitudes` — agregar feedback al usuario (requiere definir el patrón de toast).

> Nota: hay un `AGENTS.md` en `frontend/` advirtiendo que esta versión de Next.js tiene breaking changes — por eso los cambios se limitaron a colores/tipos/lógica de props, sin tocar APIs de Next.

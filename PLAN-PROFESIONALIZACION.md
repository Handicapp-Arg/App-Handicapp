# Plan de profesionalización — HandicApp

> Auditoría completa web + móvil (6 frentes). Objetivo: que la app se vea **seria y profesional**, no "armada por IA".
> Cada hallazgo tiene **dónde** (archivo:línea) · **qué** · **fix** · **severidad**. Fecha: 2026-06-26.

Leyenda severidad: 🔴 alta · 🟠 media · 🟢 baja.

---

## EJE A — Emojis → iconos profesionales (lo que más "grita IA")

| ID | Dónde | Problema | Fix | Sev |
|----|-------|----------|-----|-----|
| A1 | Muro móvil `muro.tsx:184,415` | 🐴 en meta del post y 🐴/📌 en chips de tipo | `HorseHead`/`Megaphone` lucide (como web) | 🔴 |
| A2 | Modo peón `peon/[id].tsx:114-122` | 7 emojis gigantes (🌾💧🧹🐎🧽⚠️📝) como iconografía primaria | iconos lucide (Wheat/Droplet/Brush…) monocromo sobre marca | 🔴 |
| A3 | Chips de evento móvil `caballos/[id].tsx:1462-1465` | `📝 Nota`,`🏇 Entrenamiento`,`💉 Salud`,`🏁 Carrera` | icono lucide + label, sin emoji en el string | 🟠 |
| A4 | Gasto web `caballos/[id]/page.tsx:64-72` | categorías con emojis (🌾💉🔨🏇🔧🚛📦); móvil ya usa lucide | mismos iconos lucide que móvil | 🔴 |
| A5 | Empty Finanzas `caballos/[id]` web:1028 / móvil:1534 | 💰 como ilustración de estado vacío | icono `Banknote`/`Wallet` en círculo atenuado | 🟠 |
| A6 | Supervisión web `supervision/page.tsx:20-48` | `Carrot` (zanahoria) para "rutina" | `ClipboardList` (como móvil) | 🔴 |
| A7 | Remates móvil `remates/[id].tsx:127` | `📍` para ubicación (resto usa `MapPin`) | `MapPin` lucide | 🟠 |
| A8 | Toasts `peon/[id].tsx:64,90,107` · `jinete/[id].tsx:170` | `✓ ` inyectado en el string y el Toast YA dibuja check → doble | quitar el `✓ ` del texto | 🟠 |
| A9 | Contratos móvil `contratos.tsx:93,99,283` | glifos `✓`/`✕` en texto | iconos lucide | 🟢 |
| A10 | Facturación web `facturacion/page.tsx:70,139` | `✕` para cerrar/eliminar | `<X/>` lucide | 🟢 |
| A11 | Agenda móvil `agenda.tsx:61` / árbol `✓ Con dueño` | `✓ Completado` glifo (lucide `Check` ya importado) | usar `Check` | 🟢 |

---

## EJE B — "Arcoíris" de colores → paleta de marca (clay/cuero + neutros; color solo semántico)

| ID | Dónde | Problema | Fix | Sev |
|----|-------|----------|-----|-----|
| B1 | Ficha caballo web `caballos/[id]/page.tsx` (~848,1962,2103,2168,2237,2284,2409,2542) | 7-8 acentos por sección (green/teal/blue/orange/indigo/violet/purple) | reducir a clay + grises; color solo estados semánticos | 🔴 |
| B2 | Supervisión web `KIND_META:24-47` | color por tipo (emerald/blue/amber/red); móvil ya usa marca | neutro/marca; rojo solo alerta | 🔴 |
| B3 | Árbol `arbol` web:253 / móvil:147 | línea paterna **azul** en web, **marrón** en móvil | unificar a marrón cuero (marca) | 🔴 |
| B4 | Accesos rápidos muro web `muro/page.tsx:45-59` | 5 colores (violet/blue/emerald/orange/slate) | monocromo + acento clay en hover | 🟠 |
| B5 | Móvil caballos `index.tsx:842-845,886` | píldora actividad + chip categoría en azul (off-brand) | `c.brand`/`brandSoft` | 🟠 |
| B6 | Calendario móvil `MonthCalendar.tsx:106,112` | día seleccionado **negro** (no clay) | `c.brand` | 🟠 |
| B7 | Colores categoría gasto web vs móvil | "entrenamiento" púrpura (web) vs ámbar (móvil) | una sola fuente de verdad (shared) | 🟠 |
| B8 | Árbol web `arbol:291,437` | header "Caballo" azul + SexDot azul/rosa chocan con sujeto clay | reducir azul/rosa; sujeto clay | 🟠 |
| B9 | Padrón web `padron/page.tsx:471` | card seleccionada `bg-blue-50` | `bg-clay-500/10` | 🟠 |
| B10 | Reportes `reportes/page.tsx:322` | emerald decorativo en vencimientos (4º color, no semáforo) | icono en color de marca | 🟠 |
| B11 | Nodo "Sujeto" del árbol | clay (arbol web) / negro (padrón web) / hex (móvil) — 3 colores | unificar + usar `HorseHead` en los 3 | 🟠 |

---

## EJE C — Iconos/logos OFICIALES de marca (pagos)

| ID | Dónde | Problema | Fix | Sev |
|----|-------|----------|-----|-----|
| C1 | `payment-methods.tsx` (web) + `PaymentMethods.tsx` (móvil) | Visa/MC/Amex/MercadoPago **dibujados a mano** (Visa = palabra tipeada, MP = garabato con "MP") | SVG **oficiales** de marca (react-payment-icons + brand kit MP); paridad web↔móvil | 🔴 |
| C2 | Mastercard web vs móvil | renderizado distinto (móvil finge el solape con opacity) | mismo SVG oficial en ambos | 🟠 |
| C3 | Medios en AR | faltan **Cabal** y **Naranja** (muy usadas); Amex tiene baja penetración | mostrar el set real que habilita MP | 🟠 |
| C4 | WhatsApp `icons/whatsapp.tsx` + móvil | aceptable pero sigue siendo path a mano | usar glyph oficial de brand assets si se busca rigor | 🟢 |

---

## EJE D — Paridad web/móvil (unificar labels, modelo, iconos, colores en `packages/shared`)

| ID | Dónde | Problema | Fix | Sev |
|----|-------|----------|-----|-----|
| D1 | Tipos de evento | "carrera" solo móvil, "gasto" solo web → badge roto al cruzar plataforma | unificar set + badges en ambos | 🔴 |
| D2 | Aprobar ingreso a org | móvil incluye **admin/staff**, web solo 4 roles operativos | móvil usa la lista acotada de web | 🔴 (permiso) |
| D3 | Iconos por ítem de nav | Remates (Gavel/Trophy), Padrón (ScrollText/BookOpen), Árbol (Network/GitBranch), Caballos (HorseHead/grilla), Eventos (CalendarClock/FileText), Directorio (MapPin/Map), Solicitudes (Inbox/Mail) | **mapa de iconos único** consumido por sidebar/navbar/feed/móvil | 🔴 |
| D4 | Formato de moneda | 4 estrategias: `$` / `$ ` / `USD` / `U$D`; helper `formatAmount` ignorado | **un helper `formatMoney(amount,currency)`** compartido; erradicar inline | 🟠 |
| D5 | Nombres de plan | "Gratis"/"Free"/"Stable Basic"/"Free (3 caballos)" mezclados en la misma página | set único de labels (con/sin cupo) | 🟠 |
| D6 | Tabs padrón | "Pedigree/Descendencia" (móvil) vs "Pedigrí/Progenie" (web) | unificar en español | 🟠 |
| D7 | Copy registro | "Crear cuenta / Completá tus datos" (web) vs "Creá tu cuenta / Empezá a gestionar…" (móvil) | elegir uno (recom. móvil) | 🟠 |
| D8 | Tipos de post muro | "Actualización" (web) vs "Caballo" (móvil) | unificar label + icono | 🟠 |
| D9 | Remates | "Venta directa/Directo", moneda default ARS/USD, Gavel/Trophy, `formatCurrency` vs `formatARS` | unificar label/moneda/icono/formato | 🟠 |
| D10 | Descripciones de rol org | web completas vs móvil recortadas | centralizar en shared | 🟠 |
| D11 | Empty states (muro, comentarios, directorio, supervisión) | cada plataforma con su redacción | microcopys centralizados y reusados | 🟢 |
| D12 | Wordmark "HandicApp" móvil `login.tsx:182` | sin `fontFamily` de marca (web sí) | `fontFamily.semibold` | 🟢 |

---

## EJE E — Bugs reales / flujos rotos (funcionalidad, no cosmético)

| ID | Dónde | Problema | Fix | Sev |
|----|-------|----------|-----|-----|
| E1 | Registro web `registro/page.tsx:11-16,44` | deja elegir **"Administrador · Acceso completo"** (móvil lo filtra) | filtrar `admin` (y vet si aplica); idealmente `/roles/public` | 🔴 riesgo |
| E2 | Contratos web `contratos/page.tsx:27` | plantilla con `{establecimiento}`/`{propietario}` **sin reemplazar** → salen las llaves | interpolar nombres reales o redacción genérica | 🔴 |
| E3 | Facturación web `facturacion/page.tsx:144,243` | factura en **USD** muestra ítems/total con `$` | propagar `currency` + helper | 🔴 |
| E4 | Facturación móvil `facturacion.tsx:125` | empty invita a "crear facturas" pero **no hay botón de crear** | agregar "Nueva factura" + modal (como web) | 🔴 |
| E5 | Org `organizacion/page.tsx:112` | WhatsApp **falso** `wa.me/5491100000000` en "Mejorar plan" | número real desde env, o deshabilitar CTA | 🔴 |
| E6 | Modo peón `peon/[id].tsx:74` | guarda `⚠️ {razón}` en `description` → aparece crudo en feed del encargado y en el historial | no guardar emoji; mapear a evento/aviso real | 🔴 |
| E7 | Modo peón `peon/[id].tsx:70-80` | "algo raro" (rengo/herido) se registra como **`tarea`**, no como alerta | tipo de evento "aviso" que alimente `is_alert` | 🔴 |
| E8 | Card plan perfil móvil `perfil.tsx:683-695` | dice "Pasate a Pro" pero **no tiene botón** (dead-end); además "Pro" tiene identidad distinta a `mi-plan` | linkear a `mi-plan` o eliminar el card | 🔴 |
| E9 | Org móvil `organizacion.tsx:232-243` | "sin organización" **sin CTA** para unirse (web sí tiene) | botón "Unirme con un código" → `unirme` | 🔴 |
| E10 | Modo peón `peon/[id].tsx:59-68` | no se puede **desmarcar** una tarea; re-tap re-dispara el toast | toggle real o guard `if(done) return` | 🟠 |
| E11 | Remates web `remates/[id]/page.tsx:313-318` | "Hacer oferta" = oferta vinculante **sin confirmación** | diálogo de confirmación antes de ofertar | 🟠 |
| E12 | Remates `crear` móvil:419 / web:349 | CTA "Publicar caballo" pero crea **borrador** | copy honesto ("Crear borrador") o publicar de verdad | 🟠 |
| E13 | Enterprise `perfil` web:108 / `mi-plan` móvil:99 | tagline "a medida" pero checkout self-serve con precio fijo | CTA "Contactar ventas" | 🟠 |

---

## EJE F — Copy que filtra el backend / poco profesional

| ID | Dónde | Problema | Fix | Sev |
|----|-------|----------|-----|-----|
| F1 | Checkout `mi-plan.tsx:367` / `perfil.tsx:385` | error **"MercadoPago no está configurado"** al usuario | "No pudimos iniciar el pago. Probá de nuevo en unos minutos." | 🟠 |
| F2 | Padrón web `padron/page.tsx:27,360,361,390-407` | "claim/score", "(40 pts)", pesos del scoring expuestos | "Solicitud/Reclamo", "Puntaje"; quitar "(N pts)" | 🟠 |
| F3 | Árbol web `arbol/page.tsx:641` · Padrón `698` | jerga "scraping" / "el sistema buscará en fuentes externas" | "Estamos completando estos datos, puede demorar" | 🟠 |
| F4 | Eventos web `eventos/page.tsx:751` · caballo `1558` | "quedará en el historial del sistema pero no será visible" (soft-delete) | "Se eliminará el evento. No se puede deshacer." | 🟢 |
| F5 | Superadmin `superadmin/page.tsx:43` | estado **"Trial"** en inglés entre estados en español | "Prueba" / "En prueba" | 🟠 |
| F6 | Padrón admin bar `padron:514` | `{n} new · {n} upd · {n} err` en inglés | "nuevos · actualizados · errores" | 🟠 |
| F7 | Org `organizacion/page.tsx:177` | "Le mandaremos por mail una invitación" pero **solo genera link** | "Generá un link único y compartilo…" | 🟠 |
| F8 | Topbar web `topbar.tsx:21` | comentario en código "Estilo 'MercadoPago web'" (nombra competidor) | limpiar el comentario | 🟢 |
| F9 | Checkout | "Pago 100% seguro" (suena a venta) | "Pago seguro procesado por MercadoPago" | 🟢 |
| F10 | Padrón web `padron:671` | placeholder "Buscar por nombre, raza, país…" pero solo busca `name` | "Buscar por nombre…" | 🟠 |
| F11 | Superadmin `689-691` | MRR/ARR sin aclaración | tooltip o "Ingreso mensual recurrente" | 🟢 |

---

## EJE G — Ortografía / español (tildes y signos)

| ID | Dónde | Problema | Fix | Sev |
|----|-------|----------|-----|-----|
| G1 | Ficha caballo web `caballos/[id]/page.tsx:356,372,401,607,1498,1528` | "basicos", "Clasificacion", "digitos numericos", "accion", "eliminaran", "encontro", falta `¿?` | corregir tildes y signos de apertura | 🟠 |
| G2 | Barrido general | mezcla de textos con/sin tilde en la misma pantalla | pasada de ortografía en toda la UI | 🟠 |

---

## EJE H — Dark mode (sobre todo móvil, sin remap)

| ID | Dónde | Problema | Fix | Sev |
|----|-------|----------|-----|-----|
| H1 | Panel métricas entrenamiento web `training-metrics-panel.tsx:44-47` | `bg-yellow-50` fijo sin `dark:` → se rompe en oscuro (móvil sí tiene `YELLOW_DARK`) | variantes `dark:` o tokens | 🔴 |
| H2 | Facturación móvil `facturacion.tsx:216-219` | `actionBtn` con hex claros fijos (#eff6ff/#f0fdf4/#fef2f2) | derivar de `c.isDark` como el statusBadge | 🟠 |
| H3 | Contratos móvil `contratos.tsx:458-463,480-483` | banners firmado/rechazado + lookup con hex claros | patrón `c.isDark`-aware | 🟠 |
| H4 | Directorio móvil `directorio.tsx:279-293` | banner/chip "pendiente" ámbar fijo | tokens theme-aware | 🟠 |
| H5 | Org móvil `organizacion.tsx:462,479-495` | badges "dorados" con hex fijos | tokens goldSoft/goldBorder/goldText | 🟠 |
| H6 | Padrón móvil `padron.tsx:61-72,544-554` | STATUS_COLOR/BG + claimBanner con hex fijos | tokens (arbol.tsx ya lo hace bien) | 🔴 |
| H7 | Eventos web `eventos/page.tsx:26,34` | badge "nota" sin variante `dark:` | agregar `dark:` | 🟠 |

---

## EJE I — Vocabulario del dominio

| ID | Dónde | Problema | Fix | Sev |
|----|-------|----------|-----|-----|
| I1 | Org web+móvil | "organización/caballeriza/establecimiento/haras" usados como sinónimos, a veces en la misma pantalla | elegir **"caballeriza"** de cara al usuario; "organización" solo interno | 🔴 |

---

## EJE J — Dead code / smells / duplicación

| ID | Dónde | Problema | Fix | Sev |
|----|-------|----------|-----|-----|
| J1 | `PostCard.tsx:22-27` + muro móvil `655-672` | `ROLE_CONFIG` y estilos de badge de rol nunca renderizados | eliminar o implementar el badge | 🟢 |
| J2 | `peon/index.tsx` ≈ `jinete/index.tsx` | casi duplicados con "drift" de números mágicos | extraer `RoleHomeList` parametrizado | 🟠 |
| J3 | Dos árboles genealógicos web (padrón vs /arbol) y dos móvil (padron vs arbol) | UIs de árbol distintas en el mismo producto | consolidar en un componente | 🟠 |
| J4 | Directorio móvil `directorio.tsx:165-166` | timer colgado de `global as any` (no se limpia) | `useRef` como la web | 🟠 |
| J5 | Remates web/móvil | imports muertos (`Badge`,`Filter`,`Eye`,`User`), estilos muertos (`bidAvatar`) | limpiar | 🟢 |
| J6 | Jinete `[id].tsx:88` | `useUpsertTrainingMetrics('')` con id vacío (smell) | API que no permita el estado inválido | 🟢 |
| J7 | Árbol móvil `arbol.tsx:128-136,575-590` | ~20 líneas muertas ("Sin datos" nunca se renderiza) | implementar placeholder (como web) o borrar | 🟢 |
| J8 | Eventos móvil `eventos.tsx:426,428` | estilos muertos `photoRemoveText`, `photoAddIcon` | borrar | 🟢 |

---

## EJE K — UX / detalles

| ID | Dónde | Problema | Fix | Sev |
|----|-------|----------|-----|-----|
| K1 | QR ficha caballo | color distinto web/móvil; gradiente azul marino off-brand; móvil solo abre `Alert` (sin copiar/descargar) | unificar color; quitar azul; dar "Copiar enlace"+"Compartir" en móvil | 🟠 |
| K2 | Reportes gráfico | barras sin eje ni valores; tooltip web inaccesible en touch | etiquetar el mes actual / tap para ver monto | 🟢 |
| K3 | Jinete esfuerzo `[id].tsx:246-260` vs `StarsRow:38-52` | se ingresa 1-5 numérico pero el historial muestra estrellas (≈ rating) | unificar metáfora + renombrar | 🟠 |
| K4 | Agenda `MonthCalendar.tsx:8` | `WEEKDAYS=['L','M','M','J','V','S','D']` (dos "M" iguales) | "Lu Ma Mi Ju Vi Sa Do" | 🟢 |
| K5 | Móvil buscador padrón `padron.tsx:320` | `autoCapitalize="characters"` fuerza MAYÚSCULAS | `"words"`/`"none"` | 🟠 |
| K6 | Auth web (login/registro/recuperar) | H1 con tamaños distintos (19px/24px), inputs con clases distintas, flecha "←" como texto | unificar tipografía + `inputClass` + `ArrowLeft` | 🟠 |
| K7 | Navbar web `navbar.tsx:17-22` | roles operativos muestran el enum crudo ("encargado") | completar `roleLabel` | 🟠 |
| K8 | Topbar web `topbar.tsx:12-19` | `PAGE_TITLES` sin reportes/supervision/mi-plan → `<h1>` vacío; superadmin/planes muestra "Organizaciones" | completar mapa + resolver por ruta específica | 🟠 |
| K9 | Móvil peón `peon/index.tsx` + jinete: EmptyState `paw-outline` | pezuña de perro/gato para caballos | icono equino propio | 🟠 |
| K10 | Org web `JoinRequestRow:355` | mensaje de solicitud truncado a 1 línea (móvil muestra 3) | permitir 2-3 líneas | 🟢 |
| K11 | Íconos SVG a mano donde ya hay lucide | eventos (editar/PDF/cerrar), agenda ("Nuevo turno", check, X), perfil (cámara/ojo) | migrar a lucide | 🟢 |
| K12 | `mas.tsx:141,156` móvil | "Eventos" y "Contratos" con el **mismo** icono `FileText` | Eventos → `CalendarClock` | 🟠 |
| K13 | Capitalización `mas.tsx` | mezcla Title Case / sentence case ("Árbol Genealógico", "Config. notificaciones") | sentence case coherente | 🟢 |

---

## Fases de trabajo propuestas (orden sugerido)

1. ✅ **Fase 1 — Bugs y riesgos** (HECHA, commit d1138d5): E1, E2, E3, E5, E6, E7, D2, F1. *Lo que hace quedar mal en serio.*
   - Pendiente menor detectado: `alerts_count` del dashboard del encargado no cuenta las alertas del día por desfase de zona horaria (el ítem sí aparece en el feed). Revisar junto al patrón TZ conocido (`eventAt`).
2. **Fase 2 — Emojis → iconos** (EJE A completo): la "cara de IA" #1.
3. **Fase 3 — Arcoíris → marca** (EJE B): la "cara de IA" #2.
4. **Fase 4 — Logos oficiales de pago** (EJE C): confianza en el checkout.
5. **Fase 5 — Paridad web/móvil** (EJE D): diccionario compartido de labels/iconos/colores/moneda.
6. **Fase 6 — Copy + ortografía** (EJE F + G): lenguaje serio, tildes.
7. **Fase 7 — Dark mode móvil** (EJE H): tokens theme-aware.
8. **Fase 8 — Flujos rotos/dead-ends** (EJE E resto): E4, E8, E9, E10.
9. **Fase 9 — Vocabulario + limpieza** (EJE I + J).
10. **Fase 10 — Detalles UX** (EJE K).

**Lo que está bien (no tocar):** libreta sanitaria (semáforo con iconos), rutina móvil (autor+hora), fotos verificadas, PedigreeTab móvil, superadmin/planes, gating del acceso de pruebas, fechas es-AR consistentes, voseo correcto.

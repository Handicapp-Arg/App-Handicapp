# Convenciones de UI — HandicApp móvil

> Fuente única de verdad para el rediseño. Si algo no está acá, mirá cómo quedó
> `app/(auth)/login.tsx`, que es la pantalla de referencia.

## Principio

La app se sentía "de escritorio" porque estaba diseñada como una página web:
tarjetas flotantes con borde y sombra, rótulos arriba de cada campo, texto chico,
y cada pantalla resolviendo por su cuenta lo que debería ser un componente.

**La jerarquía se hace con tipografía y espacio, no con cajas.**

---

## Componentes obligatorios

Nunca escribir un `<Modal>` a mano. Existen tres, y cubren todos los casos:

| Componente | Cuándo | Import |
|---|---|---|
| `BottomSheet` | Hoja simple: un selector, una lista corta de opciones | `components/BottomSheet` |
| `ActionSheet` | Menú de acciones sobre un elemento (el menú de 3 puntos) | `components/ActionSheet` |
| `FormSheet` | Formulario: header fijo, cuerpo scrolleable, footer con botones | `components/FormSheet` |

```tsx
// Menú de acciones — reemplaza cualquier menú flotante hecho a mano.
<ActionSheet
  visible={menuAbierto}
  onClose={() => setMenuAbierto(false)}
  acciones={[
    { label: 'Editar', Icon: Pencil, onPress: editar },
    { label: 'Eliminar', Icon: Trash2, destructiva: true, onPress: borrar },
  ]}
/>

// Formulario
<FormSheet
  visible={abierto}
  onClose={cerrar}
  title="Nuevo turno"
  footer={<>...botones...</>}
>
  ...campos...
</FormSheet>
```

### Trampa al migrar un formulario

Antes el formulario vivía *dentro* del `<Modal>`, así que se destruía al cerrarse
y volvía a abrirse vacío. Con `FormSheet` el componente queda montado, así que
**hay que limpiar el estado al abrir** o el usuario encuentra lo que tipeó la vez
anterior:

```tsx
useEffect(() => {
  if (!visible) return;
  setTitulo(''); setNotas(''); setError('');
}, [visible]);
```

Y el componente pasa a recibir `visible` como prop, en vez de que el padre lo
envuelva en un `<Modal>`.

---

## Otros componentes del sistema

| Componente | Para qué |
|---|---|
| `AppImage` | **Toda** imagen remota. Nunca el `<Image>` de react-native: no cachea ni hace transición |
| `ErrorState` | Cuando una consulta falla. Distingue sin señal de error de servidor, y ofrece reintentar |
| `EmptyState` | Cuando no hay datos. **No** usarlo si la consulta falló — para eso está `ErrorState` |
| `Skeleton` / `ListRowSkeleton` / `EventRowSkeleton` | Mientras carga. Preferir siempre al `ActivityIndicator` suelto |
| `Avatar` | Foto o inicial de una persona |

Orden correcto de estados en una lista:

```tsx
{isError && items.length === 0 ? <ErrorState onRetry={refetch} />
  : isLoading ? <Skeleton />
  : items.length === 0 ? <EmptyState ... />
  : <FlatList ... />}
```

El error va **antes** que el vacío: si la consulta falló, decir "no hay caballos"
es mentira.

---

## El fondo es el lienzo (ley del 02/09 — la más importante)

**Prohibido "caja dentro de caja".** El feedback textual del dueño tras recorrer
la app: "muchos componentes dentro de componentes, eso no es nativo en móvil".
Las dos pantallas que aprobó como canon son **login** y **Más**: el contenido
vive DIRECTO sobre `c.bg`, las secciones se separan con título + aire, no con
envoltorios.

- **Se aplana** (pierde su fondo de tarjeta y vive sobre el bg): envoltorios de
  sección, formularios, filas de configuración/listas, grids de info, paneles
  que solo agrupan. La fila estilo Más (ícono + texto + chevron, minHeight 52,
  sin divisores) es el patrón para listas de opciones.
- **Conserva superficie** (`c.surface` + sombra sutil): solo lo que ES una
  tarjeta de contenido real y autónomo — posts del muro, tarjetas foto de
  caballos, turnos del carrusel del Inicio, un "hero" de dato (total del mes).
  Regla práctica: si adentro tiene más de un tema, no es tarjeta, es sección.
- Inputs conservan su relleno (`#f2f0eb` claro / surfaceAlt oscuro) — el campo
  es un control, no una caja.
- Al aplanar, revisar que la jerarquía no se pierda: títulos de sección con
  peso, aire generoso entre grupos (space[6]+), y dentro del grupo compacto.

## Sin bordes (regla nueva, 01/09)

**Las tarjetas y superficies NO llevan borde.** El borde gris alrededor de cada
caja era lo que hacía ver la app como un wireframe ("app de mentira"). La
jerarquía se logra como en Instagram/Airbnb:

- **Claro**: tarjeta blanca sobre fondo `c.bg` (#f9fafb) + sombra apenas
  perceptible (opacity 0.05, radius 8). Ya está en `card.base/padded/overflow`
  de `styles/common.ts` — usarlos.
- **Oscuro**: sin sombra (no se ve); alcanza el contraste `c.surface` sobre `c.bg`.
- **Inputs**: rellenos (`#f1f2f4` en claro, `surfaceAlt` en oscuro), sin borde
  visible; el foco pinta el borde en `c.brand` (el borde transparente de 1.5 ya
  reserva el espacio — no hay salto).
- **Separadores dentro de una lista** (filas de un menú, celdas): un hairline
  `c.border` está bien — eso es nativo de iOS. Lo prohibido es el borde
  ALREDEDOR de tarjetas y cajas.
- Excepciones legítimas: el borde de foco, bordes semánticos de alerta
  (`errorBox`), y anillos de avatar.

Al tocar una pantalla: borrar `borderWidth`/`borderColor` de tarjetas propias y
reemplazar por `...card.base` o el patrón de sombra de arriba.

## Medidas

Todo sale de `styles/tokens.ts`. Nunca números sueltos.

```ts
text  = { xs: 12, sm: 14, base: 16, md: 17, lg: 22, xl: 26, '2xl': 30, display: 34 }
touch = { min: 44, field: 56, button: 56 }
```

- **Cuerpo de texto: `text.md` (17).** Es la base de iOS. `text.sm` (14) es para
  metadatos y rótulos secundarios, no para contenido.
- **Títulos de pantalla: `text.xl` o `display`**, peso 700-800, `letterSpacing: -0.5`.
- **Campos y botones: 56 de alto** (`touch.field`). Nada táctil por debajo de 44.
- Los estilos compartidos de `styles/common.ts` (`input.base`, `button.primary`)
  ya tienen estas medidas: usarlos en vez de redefinir.

## Campos de formulario

- **Sin rótulo arriba.** El `placeholder` describe el campo.
- El campo enfocado se marca con borde `c.brand` (ver `input.focused`).
- Encadenar: `returnKeyType="next"` + `onSubmitEditing` que enfoca el siguiente,
  y `"go"` en el último para enviar.
- `textContentType` siempre (`emailAddress`, `password`, `newPassword`, `name`):
  es lo que hace que el llavero de iOS ofrezca autocompletar.
- El contenedor scrolleable lleva `automaticallyAdjustKeyboardInsets`,
  `keyboardShouldPersistTaps="handled"` y `keyboardDismissMode="interactive"`.

## Animación

- **Sin rebote.** `Easing.out(Easing.cubic)` a 280ms para entrar, 200ms para salir.
  Nada de `springify()`: el rebote se lee como salto.
- Entradas de lista escalonadas con `FadeInDown` y un retraso máximo acotado
  (`Math.min(index, 8) * 45`), para que el ítem 40 no espere dos segundos.
- Respetar siempre `prefers-reduced-motion` cuando se agregue movimiento nuevo.

## Táctil

- `haptic.selection()` al elegir algo, `haptic.light()` al confirmar,
  `haptic.error()` cuando falla, `haptic.success()` cuando sale bien.
- Botones de ícono: `hitSlop` de al menos 8.

## Accesibilidad

**Todo botón que sea solo un ícono necesita etiqueta**, o VoiceOver lo lee como
"botón" y nada más:

```tsx
<Pressable
  accessibilityRole="button"
  accessibilityLabel="Eliminar turno"
  hitSlop={8}
>
```

- `accessibilityRole` en botones, links, encabezados e imágenes informativas.
- Las imágenes decorativas van con `accessibilityElementsHidden`.
- Un estado que cambia (me gusta / sin me gusta) cambia también su etiqueta.

## Área segura (status bar / notch / home indicator)

El síntoma que no queremos repetir: contenido metido debajo de la hora/batería
en algunas pantallas, y en otras un hueco enorme arriba. Pasa cuando dos capas
aplican el inset superior a la vez, o ninguna lo hace. Regla única:

**El inset superior (`insets.top`) se aplica UNA sola vez, en el contenedor raíz
de la pantalla — nunca en dos lugares a la vez.**

1. **Pantalla con `ScreenHeader` `scrollable`** (el header vive dentro de un
   `ScrollView`/`FlatList` como `ListHeaderComponent`, o arriba de un scroll):
   el contenedor raíz lleva `paddingTop: insets.top` y `ScreenHeader` **no**
   agrega nada (por eso existe la prop `scrollable`: le dice al header "el
   padre ya puso el aire de arriba").
   ```tsx
   <View style={[s.root, { paddingTop: insets.top }]}>
     <ScrollView>
       <ScreenHeader scrollable title="..." />
       ...
     </ScrollView>
   </View>
   ```
2. **Pantalla con `ScreenHeader` fijo (sin `scrollable`)**: el header se
   encarga solo de su propio `insets.top + space[3]`. El contenedor raíz
   **no** debe sumarle padding de nuevo.
   ```tsx
   <View style={s.root}>
     <ScreenHeader title="..." />
     <ScrollView>...</ScrollView>
   </View>
   ```
3. **Pantalla con encabezado propio (sin `ScreenHeader`)**: el contenedor
   raíz aplica `paddingTop: insets.top` y el header a mano se dibuja adentro,
   como cualquier otro contenido — no le agrega su propio inset.
4. **Pantallas full-bleed a propósito** (hero con imagen de fondo como
   `caballos/[id]`, o cámara de pantalla completa como `escanear`): el
   contenido SÍ va por debajo de la barra de estado — es el diseño. Lo que
   tiene que respetar el inset son los elementos flotantes (botón atrás, menú,
   cerrar): `top: insets.top + space[3]`, nunca `top: 0`.

Ante la duda de cuál de los tres aplica: mirá si `ScreenHeader` recibe
`scrollable`. Si lo recibe, el padre pone el aire. Si no lo recibe, el header
ya lo puso él. Sumar los dos es el bug de "hueco enorme"; no poner ninguno es
el bug de "tapado por la hora".

### Borde inferior

La barra de tabs y sus screens (`(tabs)/*`) ya reservan su propio alto (el
`CustomTabBar` mide `60 + insets.bottom`), así que el contenido no necesita
compensarla a mano — un `paddingBottom` fijo (`space[8]`–`space[12]`) alcanza
para que el último ítem no quede pegado al borde. Las pantallas que NO viven
dentro de `(tabs)` (`peon/`, `jinete/`, formularios con footer fijo) sí deben
sumar `insets.bottom` explícitamente en el contenedor con el botón/footer,
para no quedar debajo del indicador de gestos del iPhone:
```tsx
<View style={[s.footer, { paddingBottom: insets.bottom + space[4] }]}>
```

## Color

- El cuero (`c.brand`) es **acento puntual**: el botón principal, el campo
  enfocado, un valor destacado. No se pinta media pantalla con él.
- Los grises, bordes y superficies salen del theme (`c.text`, `c.textMuted`,
  `c.textFaint`, `c.border`, `c.surface`, `c.surfaceAlt`).
- Semánticos: `c.danger`, `c.success`, `c.warning`, `c.info`. Nunca un hex suelto.
- **Todo tiene que verse bien en claro y en oscuro.** Nada de colores literales
  que solo funcionen en uno de los dos.

---

## Fechas

Ninguna pantalla formatea una fecha a mano. Nada de `toLocaleDateString`,
`toLocaleString`, `toLocaleTimeString`, `Intl.DateTimeFormat` ni concatenar
un ISO — eso es lo que hace ver la app "de desarrollador" ("2026-09-01",
"01/09/2026 14:30"). Las apps consolidadas (Uber, YPF, Airbnb) siempre
humanizan: "Hoy 14:30", "Mañana", "vie 5 sep", "hace 2 días".

Toda fecha de cara al usuario sale de `lib/fechas.ts`:

| Helper | Uso | Ejemplo |
|---|---|---|
| `fechaHumana(iso)` | Fecha sola, sin hora | "Hoy" / "Mañana" / "Ayer" / "vie 5 sep" |
| `fechaHoraHumana(iso)` | Fecha + hora | "Hoy 14:30" / "vie 5 sep, 14:30" |
| `hace(iso)` | Tiempo relativo (timelines, comentarios) | "hace 5 minutos" |
| `vence(iso)` | Vencimientos (vacunas, libreta sanitaria) | "Vence en 12 días" / "Vencida hace 3 días" |

Los cuatro devuelven `''` ante una fecha inválida (nunca "Invalid Date") y
aceptan tanto `"2026-09-01"` (fecha sola) como un timestamp ISO completo —
el helper internamente ancla la fecha sola al mediodía local para no
correrse un día por huso horario, así que ya no hace falta escribir
`+ 'T12:00:00'` a mano en cada pantalla.

Esto es solo para **presentación**. El valor que viaja al backend o a un
`<DatePicker>`/input sigue siendo el ISO crudo tal cual — no tocar esos.

---

## Antes de dar algo por terminado

1. `npx tsc --noEmit` en 0.
2. Ningún `<Modal>` nuevo.
3. Ningún `<Image>` de react-native para contenido remoto.
4. Ningún número mágico donde hay un token.
5. Probado mentalmente en claro y oscuro.
6. Ninguna fecha cruda — pasa por `lib/fechas.ts`.

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

## Antes de dar algo por terminado

1. `npx tsc --noEmit` en 0.
2. Ningún `<Modal>` nuevo.
3. Ningún `<Image>` de react-native para contenido remoto.
4. Ningún número mágico donde hay un token.
5. Probado mentalmente en claro y oscuro.

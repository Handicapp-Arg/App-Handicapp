# Pendientes de backend que frenan el diseño

Lista viva de cosas que el diseño ya pide y el servidor todavía no puede dar.
Salieron de implementar el rediseño "Campo abierto 2026" en el móvil: en cada
caso se prefirió **omitir** antes que inventar un dato o dejarlo hardcodeado.

Cada entrada dice qué falta, dónde se nota y qué habría que tocar.

---

## Agenda

### Editar un turno
Hoy solo se puede crear, marcar como completado y borrar. Para cambiarle la
hora a un turno hay que borrarlo y crearlo de nuevo.

- **Falta:** `UpdateAppointmentDto`, `AgendaService.update()`, `PATCH /agenda/:id`,
  el hook `useUpdateAppointment` y la pantalla de edición en el móvil.
- **Dónde:** `backend/src/agenda/` (el controller solo expone GET, GET por caballo,
  POST, PATCH `:id/complete` y DELETE).

### Elegir con cuánta anticipación avisar
**El aviso ya existe**: `AgendaService.sendReminders()` corre cada hora y notifica
los turnos de las próximas 24 h. Lo que no existe es poder elegir ese margen, y
por eso el interruptor "avisame antes" no está en la pantalla de turno nuevo:
mostrarlo sin poder cumplirlo sería mentir.

- **Falta:** una columna tipo `remind_minutes_before` en `service_appointments`
  y ajustar la ventana de 24 h, que hoy está fija en la consulta del cron.

### Quién atiende el turno
La maqueta muestra "Malbec · Dr. García". El turno guarda `created_by` (quién lo
cargó), no quién lo atiende. Hoy la fila muestra solo el caballo.

- **Falta:** un campo de profesional (texto libre o `user_id`).

---

## Lista de caballos

### Semáforo sanitario en producción
Ya está implementado: `GET /horses` adjunta el vencimiento más urgente de cada
caballo en una sola consulta. **Falta subirlo al VPS** — hasta entonces el chip
no aparece en el teléfono.

---

## Facturación

- **Vencimiento y emisor de la factura.** La maqueta muestra "vence en 9 días" y
  el nombre de la caballeriza; `Bill` no trae ninguno de los dos.
- **Descargar el PDF** de una factura: no hay endpoint.
- **Foto del caballo por ítem**: `BillItem` no la trae.

---

## Directorio

- **Distancia y filtros** ("cerca mío", "con lugar"). `/auth/directorio` devuelve
  solo `{ id, name, horse_count }`.

---

## Reportes

- **Comparativo contra el año anterior** y **exportar el reporte**: no existen.
- El gasto por caballo sale de `/dashboard`, porque `/reports/summary` no lo
  desglosa (lo calcula y lo descarta).

---

## Muro

- **Audiencia del post** ("quién lo ve") y **guardarlo también en el historial
  del caballo**: el alta de publicación no acepta ninguno de los dos.
- **Miniatura del video**: sin `video_thumbnail_url`, la publicación muestra una
  caja con botón de play hasta que se toca.

---

## Caballo

- **Editar disciplina, sexo y pelaje.** `useUpdateHorse` solo manda `name`,
  `birth_date` y `microchip`, así que la pantalla de edición no los ofrece.
- **Hora por tarea de la rutina**: solo existe `created_at` de la rutina entera.
- **Foto del certificado sanitario**: el alta de registro médico no sube archivos.

---

## Perfil y plan

- **Foto de perfil**: se puede cambiar el color del avatar, no subir una imagen.
- **Medio de pago guardado** y **cancelar la suscripción**: no hay endpoint.
- **Preferencias de aviso por push y correo** por usuario: solo existe
  `whatsapp_opt_in`. La configuración de notificaciones que sí existe es de admin.

---

## Además, sin backend de por medio

- **Ícono de la pestaña Caballos**: hoy es una casa. Alejo va a pasar uno propio.
- **Splash e ícono de la app**: ya corregidos en el código, pero se compilan
  dentro de la app — se ven recién en una build nueva.
- **Maqueta M-Unirme**: dibuja 6 casillas para el código y el backend genera 8.
  Hay que corregir el lienzo, no el código.

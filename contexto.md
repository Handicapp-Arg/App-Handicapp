Estamos construyendo una aplicación llamada HandicApp.
Quiero que actúes como desarrollador senior fullstack.

## STACK

Frontend:
* Next.js (App Router)
* TypeScript
* Tailwind CSS
* shadcn/ui

Backend:
* Nest.js
* Express
* PostgreSQL
* typeORM

Estado:
* TanStack Query


## OBJETIVO
App web para gestionar caballos y registrar eventos de forma simple, moderna y mobile-first.


## ROLES
* admin
* propietario
* establecimiento


## FUNCIONALIDAD
1. Registro:
   el usuario elige:

* propietario
* establecimiento

2. Caballos:
* pueden ser creados por propietario o establecimiento
* tienen:

  * name
  * birth_date (opcional)
  * owner_id
  * establishment_id (opcional)

3. Eventos:
* type: salud | entrenamiento | gasto | nota
* description
* date
* horse_id


## PERMISOS
* propietario:
  crea caballos y eventos
  ve sus caballos

* establecimiento:
  crea caballos y eventos
  ve caballos asociados

* admin:
  acceso total


## ARQUITECTURA

Frontend → Backend API → PostgreSQL


## OBJETIVO TÉCNICO

Quiero una base limpia, escalable, bien estructurada y lista para producción futura, pero manteniendo el MVP simple.


Primero quiero que definas la estructura del proyecto separando frontend y backend.
